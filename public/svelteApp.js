var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    // export const isLogged = writable(false);
    const user = writable({
      id: null,
      role: null,
      login: null,
      email: null,
      discord: null,
      username: null,
      children: []
    });
    // Routing
    const location = writable('/');
    function goTo(where = "/", param = "id", value) { //TODO
      const name = where.substring(1) || 'table';
      window.history.pushState(name, name, where);
      if (value) window.location.search = "?" + param + "=" + value;
      location.set(where);
    }
    const fundRights = writable({});
    function isManager() {
      let funds;
      let res = false;
      fundRights.subscribe(f => funds = f);
      for (const fundId in funds) {
        if (funds[fundId] === 'manager') {
          res = true;
          break;
        }
      }
      return res
    }
    function isWriter() {
      let funds;
      let res = false;
      fundRights.subscribe(f => funds = f);
      for (const fundId in funds) {
        if (funds[fundId] === 'manager' || funds[fundId] === 'user') {
          res = true;
          break;
        }
      }
      return res
    }
    const fundNames = writable({
      init: 'test'
    });

    /* src\LinkButton.svelte generated by Svelte v3.38.2 */
    const file$c = "src\\LinkButton.svelte";

    function create_fragment$c(ctx) {
    	let button;
    	let t_value = (/*label*/ ctx[1] || /*to*/ ctx[0]) + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "link-button svelte-m74toc");
    			toggle_class(button, "current", /*current*/ ctx[2]);
    			add_location(button, file$c, 18, 0, 315);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*onClick*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*label, to*/ 3 && t_value !== (t_value = (/*label*/ ctx[1] || /*to*/ ctx[0]) + "")) set_data_dev(t, t_value);

    			if (dirty & /*current*/ 4) {
    				toggle_class(button, "current", /*current*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("LinkButton", slots, []);
    	let { to } = $$props;
    	let { label = to } = $$props;
    	let current = false;

    	function onClick() {
    		$$invalidate(2, current = !current);
    		goTo("/" + to);
    	}

    	location.subscribe(loc => {
    		if (loc.substring(1) === to) $$invalidate(2, current = true); else $$invalidate(2, current = false);
    	});

    	const writable_props = ["to", "label"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<LinkButton> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("to" in $$props) $$invalidate(0, to = $$props.to);
    		if ("label" in $$props) $$invalidate(1, label = $$props.label);
    	};

    	$$self.$capture_state = () => ({
    		goTo,
    		location,
    		to,
    		label,
    		current,
    		onClick
    	});

    	$$self.$inject_state = $$props => {
    		if ("to" in $$props) $$invalidate(0, to = $$props.to);
    		if ("label" in $$props) $$invalidate(1, label = $$props.label);
    		if ("current" in $$props) $$invalidate(2, current = $$props.current);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [to, label, current, onClick];
    }

    class LinkButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { to: 0, label: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LinkButton",
    			options,
    			id: create_fragment$c.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*to*/ ctx[0] === undefined && !("to" in props)) {
    			console.warn("<LinkButton> was created without expected prop 'to'");
    		}
    	}

    	get to() {
    		throw new Error("<LinkButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set to(value) {
    		throw new Error("<LinkButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<LinkButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<LinkButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    if (window.location.hostname === 'localhost') {
      var api = window.location.protocol + '//' + "localhost:8000" + '/api/';
    } else {
      var api = window.location.protocol + '//' + "reputation.vpluseteam.com" + '/api/';
    }

    const userRightsTranslation = {
      owner: 'владелец',
      manager: 'менеджер',
      user: 'обычный пользователь',
      readonly: 'только чтение'
    };

    const login = async (credential, password) => {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },

        body: JSON.stringify({ credential, password })
      };
      try {
        const response = await fetch(api + 'auth/login/', options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    const refresh = async () => {
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
      try {
        const response = await fetch(api + 'auth/refresh', options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    const logout = async () => {
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
      try {
        const response = await fetch(api + 'auth/logout', options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    /* src\Navbar.svelte generated by Svelte v3.38.2 */
    const file$b = "src\\Navbar.svelte";

    // (18:2) {:else}
    function create_else_block$1(ctx) {
    	let linkbutton;
    	let t0;
    	let show_if = /*$user*/ ctx[0].role === "root" || isManager();
    	let t1;
    	let button;
    	let current;
    	let mounted;
    	let dispose;

    	linkbutton = new LinkButton({
    			props: { label: "Таблица", to: "" },
    			$$inline: true
    		});

    	let if_block = show_if && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			create_component(linkbutton.$$.fragment);
    			t0 = space();
    			if (if_block) if_block.c();
    			t1 = space();
    			button = element("button");
    			button.textContent = "Выйти";
    			attr_dev(button, "class", "link-button svelte-1b18jnd");
    			add_location(button, file$b, 23, 2, 607);
    		},
    		m: function mount(target, anchor) {
    			mount_component(linkbutton, target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*logOut*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$user*/ 1) show_if = /*$user*/ ctx[0].role === "root" || isManager();

    			if (show_if) {
    				if (if_block) {
    					if (dirty & /*$user*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t1.parentNode, t1);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(linkbutton.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(linkbutton.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(linkbutton, detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(18:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (16:2) {#if !$user.role}
    function create_if_block$6(ctx) {
    	let linkbutton;
    	let current;
    	linkbutton = new LinkButton({ props: { to: "login" }, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(linkbutton.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(linkbutton, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(linkbutton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(linkbutton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(linkbutton, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(16:2) {#if !$user.role}",
    		ctx
    	});

    	return block;
    }

    // (20:2) {#if $user.role === 'root' || isManager()}
    function create_if_block_1$2(ctx) {
    	let linkbutton0;
    	let t;
    	let linkbutton1;
    	let current;

    	linkbutton0 = new LinkButton({
    			props: { to: "funds", label: "Фонды" },
    			$$inline: true
    		});

    	linkbutton1 = new LinkButton({
    			props: { to: "users", label: "Пользователи" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(linkbutton0.$$.fragment);
    			t = space();
    			create_component(linkbutton1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(linkbutton0, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(linkbutton1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(linkbutton0.$$.fragment, local);
    			transition_in(linkbutton1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(linkbutton0.$$.fragment, local);
    			transition_out(linkbutton1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(linkbutton0, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(linkbutton1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(20:2) {#if $user.role === 'root' || isManager()}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let nav;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$6, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*$user*/ ctx[0].role) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			if_block.c();
    			attr_dev(nav, "class", "svelte-1b18jnd");
    			add_location(nav, file$b, 14, 0, 349);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			if_blocks[current_block_type_index].m(nav, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(nav, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let $user;
    	let $fundRights;
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(0, $user = $$value));
    	validate_store(fundRights, "fundRights");
    	component_subscribe($$self, fundRights, $$value => $$invalidate(2, $fundRights = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Navbar", slots, []);

    	async function logOut() {
    		const res = await logout();

    		if (res.status === "OK") {
    			set_store_value(user, $user = { children: [] }, $user);
    			set_store_value(fundRights, $fundRights = {}, $fundRights);
    			goTo("/login");
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		LinkButton,
    		logout,
    		fundRights,
    		goTo,
    		isManager,
    		user,
    		logOut,
    		$user,
    		$fundRights
    	});

    	return [$user, logOut];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    async function insertFund(data = {}) {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ ...data })
      };

      try {
        const response = await fetch(api + 'funds/create', options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    }

    const getFundMembers = async (id) => {
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
      try {
        const response = await fetch(api + 'funds/getMembers?id=' + id, options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    const getFunds = async () => {
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
      try {
        const response = await fetch(api + 'funds/getFunds', options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };


    const getFundFormated = async (id) => {
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
      try {
        const response = await fetch(api + 'funds/formatted?id=' + id, options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    const updateFundOwner = async (fundId, ownerId, prevOwnerId) => {
      const options = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },

        body: JSON.stringify({ fundId, ownerId, prevOwnerId })
      };
      try {
        const response = await fetch(api + 'funds/updateOwner', options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    const updateFundForm = async (fundId, data) => {
      const options = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },

        body: JSON.stringify({ fundId, data })
      };
      try {
        const response = await fetch(api + 'funds/updateForm', options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    const addUserToFund = async (userId, role, fundId) => {
      const options = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },

        body: JSON.stringify({ userId, role, fundId })
      };
      try {
        const response = await fetch(api + 'funds/addUser', options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    const updateUserRole = async (userId, role, prevRole, fundId) => {
      const options = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },

        body: JSON.stringify({ userId, role, fundId, prevRole })
      };
      try {
        const response = await fetch(api + 'funds/updateUser', options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    const deleteFromFund = async (userId, fundId, prevRole) => {
      const options = {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },

        body: JSON.stringify({ userId, fundId, prevRole })
      };
      try {
        const response = await fetch(api + 'funds/deleteUser', options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    const createFund = {
      title: 'Создание фонда',
      fields: {
        name: {
          label: "Название",
          required: true,
        },
        email: {
          label: "E-mail",
          type: "email",
          rules: [
            (val) =>
              Boolean(val) == false ||
              Boolean(val.includes("@") && val.includes(".")) ||
              "неверный формат e-mail",
          ],
        },
        skype: {
          label: "Skype",
        },
        site: {
          label: "Сайт",
        },
        discord: {
          label: "Сервер discord",
        },
        // owner: {
        //   label: "Создатель",
        //   hint: "Начните вводить имя или e-mail",
        //   options: [
        //     {
        //       name: "",
        //       id: "",
        //     },
        //   ],
        //   type: "creatable",
        //   async onKeyDown(fb, comp, val) {
        //     if (val?.length > 2) {
        //       const res = await getUsers(val, app.state.token);
        //       if (res.status === "OK") {
        //         v.setOptions(res.users);
        //       }
        //     }
        //   },
        // },
        msg: {
          type: "html",
          value: "",
          service: true,
        },
      },
      methods: {
        async onSubmit(fb, comp, data) {
          let ownId;
          user.subscribe(val => ownId = val.id);

          console.log('%c⧭', 'color: #364cd9', ownId);
          // Todo
          const cleaned = {
            owner: ownId
          };
          for (const [key, value] of Object.entries(data)) {
            if (value !== "") cleaned[key] = value;
          }


          console.log('%c⧭', 'color: #807160', cleaned);
          const res = await insertFund(cleaned);
          fb.fields.msg.value = res.msg;
          if (res.status === 'OK') {
            fundNames.update(prev => {
              return { ...prev, [res.data.fund.id]: data.name }
            });
          }
        },
      },
      buttons: {
        submit: {
          label: "отправить",
          color: "primary",
        },
      },

    };

    /* src\fund\CreateFund.svelte generated by Svelte v3.38.2 */
    const file$a = "src\\fund\\CreateFund.svelte";

    function create_fragment$a(ctx) {
    	let main;
    	let div;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			attr_dev(div, "id", "createGroupForm");
    			add_location(div, file$a, 13, 2, 199);
    			add_location(main, file$a, 12, 0, 189);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CreateFund", slots, []);

    	onMount(() => {
    		window.callForm2("#createGroupForm", {}, createFund);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CreateFund> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ onMount, createFund });
    	return [];
    }

    class CreateFund extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CreateFund",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src\Login.svelte generated by Svelte v3.38.2 */
    const file$9 = "src\\Login.svelte";

    function create_fragment$9(ctx) {
    	let main;
    	let div;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			attr_dev(div, "id", "loginForm");
    			add_location(div, file$9, 50, 4, 940);
    			add_location(main, file$9, 49, 0, 928);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Login", slots, []);

    	const config = {
    		fields: {
    			credential: {
    				label: "Логин, email или ник discord",
    				type: "email"
    			},
    			password: { label: "Пароль", type: "password" },
    			message: { type: "html", value: "" }
    		},
    		methods: {
    			async onSubmit(fb, form, data, f) {
    				const res = await login(data.credential, data.password);

    				if (res.status === "OK") {
    					user.set(res.data);
    					fb.fields.message.value = res.msg;

    					setTimeout(
    						() => {
    							goTo("/");
    						},
    						500
    					);
    				} else {
    					fb.fields.message.value = res.msg || "Неизвестная ошибка, проверьте подключение";
    				}
    			}
    		}
    	};

    	onMount(() => {
    		window.callForm2("#loginForm", {}, config);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ onMount, login, user, goTo, config });
    	return [];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    const getTable = async (query = undefined, order = 'desc') => {
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
      try {
        const response = query ? await fetch(api + 'table?id=' + query + '&order=' + order, options) : await fetch(api + 'table', options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    const getNote = async (id) => {
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
      try {
        const response = await fetch(api + 'table/note?id=' + id, options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };
    async function createNote(data) {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ ...data })
      };

      try {
        const response = await fetch(api + 'table/create', options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    }

    const deleteNote = async (id) => {
      const options = {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
      try {
        const response = await fetch(api + 'table/note?id=' + id, options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    async function updateNote(data, id) {
      const options = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ data, id })
      };

      try {
        const response = await fetch(api + 'table/update', options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    }

    /* src\table\Table.svelte generated by Svelte v3.38.2 */

    const { Object: Object_1$6 } = globals;
    const file$8 = "src\\table\\Table.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (598:6) {#each fundOptions as fund}
    function create_each_block(ctx) {
    	let option;
    	let t0_value = /*fund*/ ctx[16].name + "";
    	let t0;
    	let t1;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = /*fund*/ ctx[16].id;
    			option.value = option.__value;
    			add_location(option, file$8, 598, 8, 15258);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*fundOptions*/ 4 && t0_value !== (t0_value = /*fund*/ ctx[16].name + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*fundOptions*/ 4 && option_value_value !== (option_value_value = /*fund*/ ctx[16].id)) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(598:6) {#each fundOptions as fund}",
    		ctx
    	});

    	return block;
    }

    // (610:4) {#if $user.role === "root" || isWriter()}
    function create_if_block$5(ctx) {
    	let div;
    	let linkbutton;
    	let current;

    	linkbutton = new LinkButton({
    			props: {
    				to: "createNote",
    				label: "Создать запись"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(linkbutton.$$.fragment);
    			attr_dev(div, "class", "createContainer svelte-uvo5ax");
    			add_location(div, file$8, 610, 6, 15578);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(linkbutton, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(linkbutton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(linkbutton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(linkbutton);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(610:4) {#if $user.role === \\\"root\\\" || isWriter()}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let main;
    	let t0;
    	let t1;
    	let br;
    	let t2;
    	let div1;
    	let select;
    	let t3;
    	let div0;
    	let input;
    	let t4;
    	let i;
    	let t5;
    	let show_if = /*$user*/ ctx[3].role === "root" || isWriter();
    	let t6;
    	let div2;
    	let t7;
    	let div3;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*fundOptions*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block = show_if && create_if_block$5(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			t0 = text(/*error*/ ctx[0]);
    			t1 = space();
    			br = element("br");
    			t2 = space();
    			div1 = element("div");
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			div0 = element("div");
    			input = element("input");
    			t4 = space();
    			i = element("i");
    			t5 = space();
    			if (if_block) if_block.c();
    			t6 = space();
    			div2 = element("div");
    			t7 = space();
    			div3 = element("div");
    			add_location(br, file$8, 593, 2, 15067);
    			if (/*currentFund*/ ctx[1] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[6].call(select));
    			add_location(select, file$8, 596, 4, 15161);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Поиск записей");
    			attr_dev(input, "class", "svelte-uvo5ax");
    			add_location(input, file$8, 605, 6, 15402);
    			attr_dev(i, "class", "search link icon");
    			add_location(i, file$8, 606, 6, 15479);
    			attr_dev(div0, "class", "ui icon input item");
    			add_location(div0, file$8, 604, 4, 15362);
    			attr_dev(div1, "class", "userControls inline svelte-uvo5ax");
    			add_location(div1, file$8, 594, 2, 15077);
    			attr_dev(div2, "id", "tableMountingPoint");
    			add_location(div2, file$8, 616, 2, 15711);
    			attr_dev(div3, "id", "modalPoint");
    			add_location(div3, file$8, 617, 2, 15746);
    			add_location(main, file$8, 591, 0, 15046);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, t0);
    			append_dev(main, t1);
    			append_dev(main, br);
    			append_dev(main, t2);
    			append_dev(main, div1);
    			append_dev(div1, select);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*currentFund*/ ctx[1]);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, input);
    			append_dev(div0, t4);
    			append_dev(div0, i);
    			append_dev(div1, t5);
    			if (if_block) if_block.m(div1, null);
    			append_dev(main, t6);
    			append_dev(main, div2);
    			append_dev(main, t7);
    			append_dev(main, div3);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*select_change_handler*/ ctx[6]),
    					listen_dev(select, "change", /*onBlur*/ ctx[5], false, false, false),
    					listen_dev(input, "input", /*onFilter*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*error*/ 1) set_data_dev(t0, /*error*/ ctx[0]);

    			if (dirty & /*fundOptions*/ 4) {
    				each_value = /*fundOptions*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*currentFund, fundOptions*/ 6) {
    				select_option(select, /*currentFund*/ ctx[1]);
    			}

    			if (dirty & /*$user*/ 8) show_if = /*$user*/ ctx[3].role === "root" || isWriter();

    			if (show_if) {
    				if (if_block) {
    					if (dirty & /*$user*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$5(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let fundOptions;
    	let $user;
    	let $fundRights;
    	let $fundNames;
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(3, $user = $$value));
    	validate_store(fundRights, "fundRights");
    	component_subscribe($$self, fundRights, $$value => $$invalidate(9, $fundRights = $$value));
    	validate_store(fundNames, "fundNames");
    	component_subscribe($$self, fundNames, $$value => $$invalidate(10, $fundNames = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Table", slots, []);
    	let error = "";
    	let query;
    	let order = "desc";
    	let where = "";
    	let timeout;
    	let currentFund = "";

    	async function tableRequest() {
    		const res = await getTable(query, order);
    		if (res.status !== "OK") return $$invalidate(0, error = res.msg || res);
    		return res;
    	}

    	function mountTable(data = [], last_page) {
    		// Preparations
    		const arrayFormatter = cell => {
    			const { field } = cell._cell.column;
    			const content = cell._cell.row.data[field].join(", ");
    			const div = document.createElement("div");
    			div.title = content;
    			div.innerText = content;
    			return div;
    		};

    		const arrayField = (name, label) => {
    			return {
    				title: label,
    				field: name,
    				formatter: arrayFormatter
    			};
    		};

    		// Table mounting
    		new Tabulator("#tableMountingPoint",
    		{
    				data,
    				pagination: "remote", //enable remote pagination
    				paginationSize: 25,
    				paginationSizeSelector: [10, 25, 50, 100],
    				ajaxURL: api + "table", //set url for ajax request
    				ajaxParams: {
    					where,
    					id: query || "",
    					order,
    					author: currentFund
    				},
    				columnMaxWidth: 300,
    				dataTree: true,
    				// groupBy: "fundName",
    				columns: [
    					{
    						title: "<div class='editColumnTitle'></div>",
    						field: "id",
    						frozen: true,
    						minWidth: 0,
    						width: 54,
    						formatter(cell) {
    							const id = cell._cell.row.data.id;
    							const author = cell._cell.row.data.author;
    							const a = document.createElement("i");
    							a.className = "linkToRow material-icons notranslate";

    							if (cell._cell.row.data.history) {
    								a.addEventListener("click", () => {
    									mountModal(id, cell._cell.row.data);
    								});

    								a.innerText = "visibility";
    								return a;
    							}

    							if ($user.role === "root" || $user.role === "admin" || $fundRights[author] && $fundRights[author] !== "readonly") {
    								a.addEventListener("click", () => goTo("/editNote", "id", id));
    								a.innerText = "create";
    								return a;
    							} else {
    								a.addEventListener("click", () => {
    									mountModal(id, cell._cell.row.data);
    								});

    								a.innerText = "visibility";
    								return a;
    							}
    						},
    						headerSort: false
    					},
    					{
    						title: "Фонд",
    						field: "author",
    						formatter: cell => {
    							const author = cell._cell.row.data.author;
    							return $fundNames[author];
    						}
    					},
    					{
    						title: "Создано",
    						field: "created",
    						formatter: cell => {
    							if (cell._cell.row.data.old) {
    								return "архив";
    							} else return moment(cell._cell.row.data.created).format("MM-DD-YYYY");
    						}
    					},
    					{
    						title: "Обновлено",
    						field: "updated",
    						formatter: cell => {
    							if (cell._cell.row.data.old) {
    								return "архив";
    							} else return moment(cell._cell.row.data.updated).format("MM-DD-YYYY");
    						}
    					},
    					{
    						title: "Автор",
    						field: "fundName",
    						visible: false,
    						sorter: "string"
    					},
    					{
    						title: "Арбитраж",
    						field: "case",
    						width: 150,
    						formatter(cell, formatterParams, onRendered) {
    							const mappos = cell._cell.row.data.case.map(caseObj => {
    								return caseObj.arbitrage;
    							});

    							const content = mappos.join(", ");
    							const div = document.createElement("div");
    							div.title = content;
    							div.innerText = content;
    							return div;
    						},
    						sorter: "string"
    					},
    					{
    						title: "Ники",
    						field: "nickname",
    						width: 350,
    						formatter(cell) {
    							const mappos = cell._cell.row.data.nickname.map(obj => {
    								if (cell._cell.row.data.old) return cell._cell.row.data.nicknameOld; else if (obj.room) return obj.room + (obj.value && " - " + obj.value); else return obj.value;
    							});

    							const content = mappos.join(", ");
    							const div = document.createElement("div");
    							div.title = content;
    							div.innerText = content;
    							return div;
    						}
    					},
    					{
    						title: "Дисциплина",
    						field: "nickname",
    						width: 150,
    						formatter(cell, formatterParams, onRendered) {
    							const mappos = cell._cell.row.data.nickname.map(nickObj => {
    								return nickObj.discipline; // !
    							});

    							return mappos.join(", ");
    						},
    						sorter: "string"
    					},
    					{
    						title: "ФИО",
    						field: "FIO",
    						width: 250,
    						formatter(cell, formatterParams, onRendered) {
    							const mappos = cell._cell.row.data.FIO.map(fioObj => {
    								return (fioObj.lastname || "") + " " + (fioObj.firstname || "") + " " + (fioObj.middlename || "");
    							});

    							return mappos.join(", ");
    						}
    					},
    					{
    						title: "Описание",
    						field: "case",
    						width: 250,
    						formatter(cell, formatterParams, onRendered) {
    							const mappos = cell._cell.row.data.case.map(caseObj => {
    								return caseObj.descr;
    							});

    							const content = mappos.join(" | ");
    							const div = document.createElement("div");
    							div.title = content;
    							div.innerText = content;
    							return div;
    						},
    						sorter: "string"
    					},
    					{
    						title: "Ущерб ($)",
    						field: "case",
    						width: 100,
    						formatter(cell, formatterParams, onRendered) {
    							const mappos = cell._cell.row.data.case.map(caseObj => {
    								return caseObj.amount;
    							});

    							const content = mappos.join(" | ");
    							const div = document.createElement("div");
    							div.title = content;
    							div.innerText = content;
    							return div;
    						},
    						sorter: "string"
    					},
    					arrayField("gipsyteam", "Gipsy team"),
    					arrayField("skype", "Skype"),
    					arrayField("skrill", "Skrill"),
    					arrayField("neteller", "Neteller"),
    					arrayField("phone", "Телефоны"),
    					{
    						title: "Адреса",
    						field: "location",
    						formatter(cell, formatterParams, onRendered) {
    							const mappos = cell._cell.row.data.location.map(obj => {
    								return obj.country + " " + obj.town + " " + obj.address;
    							});

    							return mappos.join(" ,");
    						}
    					},
    					arrayField("pokerstrategy", "Poker Strategy"),
    					arrayField("google", "Google"),
    					arrayField("mail", "e-mail"),
    					arrayField("vk", "Вконтакте"),
    					arrayField("facebook", "Facebook"),
    					arrayField("blog", "Блог"),
    					arrayField("forum", "Форум"),
    					arrayField("instagram", "Instagram"),
    					arrayField("ecopayz", "Ecopayz"),
    					{
    						title: "Webmoney",
    						field: "webmoney",
    						formatter(cell, formatterParams, onRendered) {
    							const mappos = cell._cell.row.data.webmoney.map(obj => {
    								const wallets = obj.wallets && Array.isArray(obj.wallets) && obj.wallets.join(" ,");
    								return obj.WMID + ": " + wallets;
    							});

    							return mappos.join(" | ");
    						}
    					},
    					{ title: "Комментарии", field: "comments" }
    				],
    				locale: true,
    				langs: {
    					"en-gb": {
    						columns: {},
    						ajax: { loading: "Loading", error: "Error" },
    						groups: { item: "item", items: "items" },
    						pagination: {
    							page_size: "Page Size",
    							page_title: "Show Page",
    							first: "First",
    							first_title: "First Page",
    							last: "Last",
    							last_title: "Last Page",
    							prev: "Prev",
    							prev_title: "Prev Page",
    							next: "Next",
    							next_title: "Next Page",
    							all: "All"
    						},
    						headerFilters: {
    							default: "filter column...",
    							columns: { column: "filter name..." }
    						},
    						custom: {}
    					},
    					"ru-ru": {
    						columns: {},
    						ajax: { loading: "Загрузка...", error: "Ошибка!" },
    						groups: { item: "свойство", items: "свойства" },
    						pagination: {
    							page_size: "Кол-во строк",
    							page_title: "Показать страницу",
    							first: "Первая",
    							first_title: "Первая страница",
    							last: "Последняя",
    							last_title: "Последняя страница",
    							prev: "Пред.",
    							prev_title: "Предыдущая страница",
    							next: "След.",
    							next_title: "Следущая страница",
    							all: "Всё"
    						},
    						headerFilters: { default: "Отфильтровать...", columns: {} },
    						custom: {}
    					}
    				},
    				tableBuilt() {
    					document.querySelector(".tabulator").classList.add("compact", "very");
    					this.redraw(true);
    				}
    			});
    	}

    	function mountModal(id, data) {
    		const modalConfig = {
    			modal: true,
    			fields: {
    				author: {
    					label: "Автор",
    					disabled: true,
    					value: $fundNames[id]
    				},
    				// Rest info
    				case: {
    					label: "Арбитраж",
    					type: "multiple",
    					value: [],
    					settings: {
    						arbitrage: { label: "Арбитраж", row: 1 },
    						descr: {
    							label: "Описание",
    							type: "textarea",
    							row: 1
    						},
    						amount: { label: "Размер", row: 1 }
    					}
    				},
    				nickname: {
    					label: "Дисциплины",
    					type: "multiple",
    					value: [],
    					settings: {
    						discipline: { label: "Дисциплина", row: 1 },
    						room: { label: "Room", row: 1 },
    						value: { label: "Nick", row: 1 }
    					}
    				},
    				horizont: {
    					type: "html",
    					value: "<div class=\"filler\"/>"
    				},
    				nicknameOld: {
    					label: "Архивные значения",
    					type: "textarea",
    					visible: false
    				},
    				FIO: {
    					label: "ФИО",
    					type: "multiple",
    					value: [],
    					settings: {
    						firstname: { label: "Имя", row: 1 },
    						lastname: { label: "Фамилия", row: 1 },
    						middlename: { label: "Отчество", row: 1 }
    					}
    				},
    				horizont2: {
    					type: "html",
    					value: "<hr class=\"q-ma-none q-pa-none\"/>"
    				},
    				gipsyteam: {
    					label: "Gipsy team",
    					type: "creatable",
    					outlined: true
    				},
    				skype: {
    					label: "Аккаунты Skype",
    					type: "creatable",
    					outlined: true
    				},
    				skrill: {
    					label: "Аккаунты skrill",
    					type: "creatable",
    					outlined: true
    				},
    				neteller: {
    					label: "Аккаунты neteller",
    					type: "creatable",
    					outlined: true
    				},
    				phone: {
    					label: "Телефоны",
    					type: "creatable",
    					outlined: true
    				},
    				pokerstrategy: {
    					label: "Poker Strategy",
    					type: "creatable",
    					outlined: true
    				},
    				google: {
    					label: "Google аккаунты",
    					type: "creatable",
    					outlined: true
    				},
    				mail: {
    					label: "Адреса e-mail",
    					type: "creatable",
    					outlined: true
    				},
    				vk: {
    					label: "Аккаунты vkontakte",
    					type: "creatable",
    					outlined: true
    				},
    				facebook: {
    					label: "Аккаунты facebook",
    					type: "creatable",
    					outlined: true
    				},
    				blog: {
    					label: "Блоги",
    					type: "creatable",
    					outlined: true
    				},
    				instagram: {
    					label: "Аккаунты instagram",
    					type: "creatable",
    					outlined: true
    				},
    				forum: {
    					label: "Форумы",
    					type: "creatable",
    					outlined: true
    				},
    				ecopayz: {
    					label: "Аккаунты ecopayz",
    					type: "creatable",
    					outlined: true
    				},
    				location: {
    					label: "Адреса",
    					type: "multiple",
    					value: [],
    					settings: {
    						country: { label: "Страна", row: 1 },
    						town: { label: "Город", row: 1 },
    						address: { label: "Адрес", row: 1 }
    					}
    				},
    				webmoney: {
    					label: "Аккаунты Webmoney",
    					type: "multiple",
    					value: [],
    					settings: {
    						WMID: { row: 1, label: "WMID", required: true },
    						wallets: {
    							label: "Кошельки",
    							type: "creatable",
    							row: 1
    						}
    					}
    				},
    				comments: { label: "Комментарии", type: "textarea" },
    				old: {
    					type: "checkbox",
    					label: "Архивная запись",
    					hint: "снимите флажок, если запись была отредактирована в новый формат"
    				}
    			},
    			title: "Просмотр записи",
    			buttons: null,
    			noButtons: true,
    			global: { fields: { readonly: true } }
    		};

    		window.callForm2("#modalPoint", data, modalConfig);
    	}

    	async function onFilter(e) {
    		let input = e.target.value;
    		clearTimeout(timeout);

    		timeout = setTimeout(
    			() => {
    				where = input;
    				mountTable();
    			},
    			500
    		);
    	}

    	onMount(async () => {
    		const res = await tableRequest();
    		if (res) mountTable(res.data, res.last_page);
    		const temp = [{ id: "", name: "Все фонды" }];
    		Object.entries($fundNames).forEach(([id, name]) => temp.push({ id, name }));
    		$$invalidate(2, fundOptions = temp);
    	});

    	function onBlur(e) {
    		mountTable();
    	}

    	const writable_props = [];

    	Object_1$6.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Table> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler() {
    		currentFund = select_value(this);
    		$$invalidate(1, currentFund);
    		$$invalidate(2, fundOptions);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		LinkButton,
    		api,
    		fundNames,
    		fundRights,
    		goTo,
    		isWriter,
    		user,
    		getTable,
    		error,
    		query,
    		order,
    		where,
    		timeout,
    		currentFund,
    		tableRequest,
    		mountTable,
    		mountModal,
    		onFilter,
    		onBlur,
    		fundOptions,
    		$user,
    		$fundRights,
    		$fundNames
    	});

    	$$self.$inject_state = $$props => {
    		if ("error" in $$props) $$invalidate(0, error = $$props.error);
    		if ("query" in $$props) query = $$props.query;
    		if ("order" in $$props) order = $$props.order;
    		if ("where" in $$props) where = $$props.where;
    		if ("timeout" in $$props) timeout = $$props.timeout;
    		if ("currentFund" in $$props) $$invalidate(1, currentFund = $$props.currentFund);
    		if ("fundOptions" in $$props) $$invalidate(2, fundOptions = $$props.fundOptions);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$invalidate(2, fundOptions = []);

    	return [
    		error,
    		currentFund,
    		fundOptions,
    		$user,
    		onFilter,
    		onBlur,
    		select_change_handler
    	];
    }

    class Table extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Table",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    const createUser = async (data) => {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },

        body: JSON.stringify({ ...data })
      };
      try {
        const response = await fetch(api + 'users/create/', options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    const getAllUsers = async () => {
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
      try {
        const response = await fetch(api + 'users/all', options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    const getUserInfo = async (id) => {
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
      try {
        const response = await fetch(api + 'users/fullInfo?id=' + id, options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    const updateAnoterUser = async (id, data) => {
      const options = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },

        body: JSON.stringify({ ...data, id })
      };
      try {
        const response = await fetch(api + 'users/updateAnoterUser', options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    const getUsersByQuery = async (creds) => {
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
      try {
        const response = await fetch(api + 'users/some?creds=' + creds, options);
        const res = response.json();
        return res
      } catch (error) {
        return error
      }
    };

    async function getUsers(user, funds) {
      let userInfo;


      // Root case
      if (user.role === "root") {
        const res = await getAllUsers();
        if (res.status === "OK") {
          userInfo = res.data;
          return [userInfo];
        }
        return [userInfo, res.msg || res]
      }

      // Manager case

      const controledGroups = [];
      Object.entries(funds).forEach((keyRolePair) => {
        if (keyRolePair[1] === "owner" || keyRolePair[1] === "manager")
          controledGroups.push(keyRolePair[0]);
      });

      if (controledGroups.length) {
        await Promise.all(
          controledGroups.map(async (id) => {
            const res = await getFundMembers(id);
            if (res.status === "OK") {
              userInfo = res.data || [];
            }

            else return [userInfo, res.msg || res]
          })
        );
      }

      const children = user.children;
      if (children?.length) {
        const res = await getChildren(app.state.token);
        if (res.status === "OK" && res.data.length) {
          userInfo = [...userInfo, ...res.data];
        } 
        if (res.status !== "OK") return [null, res.msg || res]
      }

      // Filter dublicats
      const f = userInfo.filter(
        (v, i, a) => a.findIndex((t) => t.id === v.id) === i
      );
      const restricted = f.filter((val) => val.role !== "root");
      return [restricted]
    }

    /* src\user\Users.svelte generated by Svelte v3.38.2 */

    const { Object: Object_1$5 } = globals;
    const file$7 = "src\\user\\Users.svelte";

    // (140:2) {#if $user.role === "root"}
    function create_if_block$4(ctx) {
    	let div;
    	let linkbutton;
    	let current;

    	linkbutton = new LinkButton({
    			props: {
    				to: "createUser",
    				label: "Создать пользователя"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(linkbutton.$$.fragment);
    			attr_dev(div, "class", "createContainer svelte-12b68td");
    			add_location(div, file$7, 140, 4, 3432);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(linkbutton, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(linkbutton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(linkbutton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(linkbutton);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(140:2) {#if $user.role === \\\"root\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div1;
    	let div0;
    	let input;
    	let t0;
    	let i;
    	let t1;
    	let t2;
    	let div2;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*$user*/ ctx[0].role === "root" && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			input = element("input");
    			t0 = space();
    			i = element("i");
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			div2 = element("div");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Поиск пользователей");
    			attr_dev(input, "class", "svelte-12b68td");
    			add_location(input, file$7, 136, 4, 3274);
    			attr_dev(i, "class", "search link icon");
    			add_location(i, file$7, 137, 4, 3355);
    			attr_dev(div0, "class", "ui icon input item");
    			add_location(div0, file$7, 135, 2, 3236);
    			attr_dev(div1, "class", "userControls inline svelte-12b68td");
    			add_location(div1, file$7, 134, 0, 3199);
    			attr_dev(div2, "id", "tableMountingPoint");
    			add_location(div2, file$7, 145, 0, 3559);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, input);
    			append_dev(div0, t0);
    			append_dev(div0, i);
    			append_dev(div1, t1);
    			if (if_block) if_block.m(div1, null);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div2, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*onFilter*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$user*/ ctx[0].role === "root") {
    				if (if_block) {
    					if (dirty & /*$user*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $fundNames;
    	let $user;
    	validate_store(fundNames, "fundNames");
    	component_subscribe($$self, fundNames, $$value => $$invalidate(5, $fundNames = $$value));
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(0, $user = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Users", slots, []);
    	let userInfo;
    	let initUserInfo;
    	let message;
    	let localFunds = $fundNames;

    	onMount(async () => {
    		[userInfo, message] = await getUsers($user);
    		initUserInfo = [...userInfo];
    		if (userInfo) mountTable();
    	});

    	function mountTable() {
    		const data = userInfo.map((row, i) => {
    			row.index = i;
    			return row;
    		});

    		new window.Tabulator("#tableMountingPoint",
    		{
    				data,
    				layout: "fitDataTable",
    				pagination: "local",
    				paginationSize: 25,
    				columns: [
    					{
    						title: "#",
    						field: "index",
    						sorter: "number",
    						cellClick(e, cell) {
    							const id = cell._cell.row.data.userProps.id;
    							goTo("/editUser", "id", id);
    						}
    					},
    					{
    						title: " ",
    						formatter(cell) {
    							const id = cell._cell.row.data.userProps.id;
    							const a = document.createElement("i");
    							a.className = "linkToRow";
    							a.addEventListener("click", () => goTo("/editUser", "id", id));
    							a.innerText = "править";
    							return a;
    						}
    					},
    					{
    						title: "Имя пользователя",
    						field: "username",
    						sorter: "string"
    					},
    					{
    						title: "Логин",
    						field: "login",
    						sorter: "string"
    					},
    					{
    						title: "Ник discord",
    						field: "discord",
    						sorter: "string"
    					},
    					{
    						title: "E-mail",
    						field: "email",
    						sorter: "string"
    					},
    					{
    						title: "Фонды",
    						field: "groups",
    						formatter(cell) {
    							const groupObj = cell._cell.row.data.userProps.funds;
    							if (!groupObj) return "";
    							const res = [];

    							Object.entries(groupObj).forEach(([fundId, role]) => {
    								res.push(localFunds[fundId] + " - " + userRightsTranslation[role]);
    							});

    							if (res.length) return res.join(", ");
    							return "";
    						}
    					}
    				]
    			});
    	}

    	function onFilter(e) {
    		let input = e.target.value;
    		if (!userInfo) return;

    		if (input.length) {
    			input = input.toLocaleLowerCase();

    			userInfo = initUserInfo.filter(val => {
    				let { username, email, discord, login, funds } = val;
    				if (username && username.toLocaleLowerCase().includes(input)) return true;
    				if (email && email.toLocaleLowerCase().includes(input)) return true;
    				if (discord && discord.toLocaleLowerCase().includes(input)) return true;
    				if (login && login.toLocaleLowerCase().includes(input)) return true;
    			}); // if (funds) { //TODO
    			//   const res = funds.filter((fundName) =>
    			//     fundName.toLocaleLowerCase().includes(input)
    			//   );
    			//   if (res.length) return true;

    			// }
    			return mountTable();
    		}

    		userInfo = initUserInfo;
    		mountTable();
    	}

    	const writable_props = [];

    	Object_1$5.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Users> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		userRightsTranslation,
    		LinkButton,
    		fundNames,
    		goTo,
    		user,
    		getUsers,
    		userInfo,
    		initUserInfo,
    		message,
    		localFunds,
    		mountTable,
    		onFilter,
    		$fundNames,
    		$user
    	});

    	$$self.$inject_state = $$props => {
    		if ("userInfo" in $$props) userInfo = $$props.userInfo;
    		if ("initUserInfo" in $$props) initUserInfo = $$props.initUserInfo;
    		if ("message" in $$props) message = $$props.message;
    		if ("localFunds" in $$props) localFunds = $$props.localFunds;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [$user, onFilter];
    }

    class Users extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Users",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src\user\CreateUser.svelte generated by Svelte v3.38.2 */

    const { Object: Object_1$4, console: console_1$1 } = globals;
    const file$6 = "src\\user\\CreateUser.svelte";

    function create_fragment$6(ctx) {
    	let div1;
    	let div0;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "id", "createUserForm");
    			add_location(div0, file$6, 101, 2, 2294);
    			add_location(div1, file$6, 100, 0, 2285);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $user;
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(0, $user = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CreateUser", slots, []);
    	const regOptions = [{ id: "guest", name: "Обычный" }];
    	if ($user.role === "root") regOptions.unshift({ id: "root", name: "root" });
    	const addChildren = id => $user.children.push(id);

    	const config = {
    		fields: {
    			name: {
    				label: "Имя пользователя",
    				hint: "Как к вам обращаться"
    			},
    			login: { label: "Логин" },
    			discord: { label: "Ник discord" },
    			email: {
    				label: "E-mail",
    				type: "email",
    				rules: [
    					val => val == false || Boolean(val.includes("@") && val.includes(".")) || "неверный формат e-mail"
    				]
    			},
    			password: {
    				label: "Пароль",
    				type: "password",
    				required: true,
    				rules: [val => val.length > 5 || "введите минимум 6 символов"]
    			}, // prepend: "settings",
    			// async prependOnClick(vNode) {  //TODO password generation
    			//   let ps = new Jen().password(10);
    			//   vNode.setValue(ps);
    			// },
    			role: {
    				label: "Роль",
    				type: "select",
    				autocomplete: false,
    				options: regOptions,
    				value: "guest",
    				visible: regOptions.length > 1
    			},
    			message: { type: "html", value: "", service: true }
    		},
    		methods: {
    			async onSubmit(fb, comp, data) {
    				if (!data.login && !data.discord && !data.email) {
    					return fb.fields.message.value = "Введите логин, или discord или email";
    				}

    				const cleaned = {};

    				for (const [key, value] of Object.entries(data)) {
    					if (value !== "") cleaned[key] = value;
    				}

    				const res = await createUser(cleaned);
    				console.log("%c⧭", "color: #40fff2", res);
    				fb.fields.message.value = res.msg || "Неизвестная ошибка, проверьте подключение";
    				if (res.status === "OK") addChildren(res.user.id);
    			}
    		},
    		// buttons: [{
    		//   type: "submit",
    		//   label: "отправить",
    		//   color: "primary",
    		// }, ],
    		title: "Создать пользователя"
    	};

    	onMount(() => {
    		window.callForm2("#createUserForm", {}, config);
    	});

    	const writable_props = [];

    	Object_1$4.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<CreateUser> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		user,
    		createUser,
    		regOptions,
    		addChildren,
    		config,
    		$user
    	});

    	return [];
    }

    class CreateUser extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CreateUser",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\user\EditUser.svelte generated by Svelte v3.38.2 */

    const { Object: Object_1$3 } = globals;
    const file$5 = "src\\user\\EditUser.svelte";

    function create_fragment$5(ctx) {
    	let div;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = space();
    			t1 = text(/*error*/ ctx[0]);
    			attr_dev(div, "id", "formEditUser");
    			add_location(div, file$5, 115, 0, 2637);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*error*/ 1) set_data_dev(t1, /*error*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $user;
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(2, $user = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("EditUser", slots, []);
    	const params = new URLSearchParams(window.location.search);
    	const id = params.get("id");
    	let error = "";
    	let editor = $user;
    	let targetUser;

    	async function retrieveUserInfo() {
    		const response = await getUserInfo(id);

    		if (response.status === "OK") {
    			targetUser = response.data;
    			mountForm();
    		} else $$invalidate(0, error = response.msg || response);
    	}

    	onMount(async () => {
    		retrieveUserInfo();
    	});

    	function mountForm() {
    		const regOptions = [{ id: "guest", name: "Обычный" }];
    		if (editor.role === "root") regOptions.unshift({ id: "root", name: "root" });

    		const formConfig = {
    			fields: {
    				username: { label: "Имя пользователя" },
    				login: { label: "Логин" },
    				discord: { label: "Ник discord" },
    				email: { label: "E-mail", type: "email" }, // rules: [
    				//   (val) =>
    				//     val == false ||
    				//     Boolean(val.includes("@") && val.includes(".")) ||
    				//     "неверный формат e-mail",
    				// ],
    				role: {
    					label: "Роль",
    					key: "",
    					type: "select",
    					autocomplete: false,
    					options: regOptions,
    					value: "guest",
    					visible: editor.role === "root"
    				},
    				password: {
    					label: "Задать новый пароль",
    					type: "password",
    					rules: [
    						val => Boolean(val) == false || val.length > 5 || "введите минимум 6 символов"
    					]
    				}, // prepend: "settings",
    				// async prependOnClick(vNode) {
    				//   let ps = new Jen().password(10);
    				//   vNode.setValue(ps);
    				// },
    				msg: { type: "html", value: "", service: true }
    			},
    			methods: {
    				async onSubmit(fb, comp, data) {
    					if (!data.login && !data.discord && !data.email) {
    						fb.fields.msg.value = "Введите логин, или discord или email";
    						return;
    					}

    					fb.fields.msg.value = "";
    					const cleaned = {};

    					for (const [key, value] of Object.entries(data)) {
    						if (value !== "") cleaned[key] = value;
    					}

    					const res = await updateAnoterUser(id, cleaned);
    					fb.fields.msg.value = res.msg;
    				}
    			}
    		};

    		window.callForm2("#formEditUser", { ...targetUser }, formConfig);
    	}

    	const writable_props = [];

    	Object_1$3.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<EditUser> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		user,
    		getUserInfo,
    		updateAnoterUser,
    		params,
    		id,
    		error,
    		editor,
    		targetUser,
    		retrieveUserInfo,
    		mountForm,
    		$user
    	});

    	$$self.$inject_state = $$props => {
    		if ("error" in $$props) $$invalidate(0, error = $$props.error);
    		if ("editor" in $$props) editor = $$props.editor;
    		if ("targetUser" in $$props) targetUser = $$props.targetUser;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [error];
    }

    class EditUser extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EditUser",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\fund\Funds.svelte generated by Svelte v3.38.2 */
    const file$4 = "src\\fund\\Funds.svelte";

    // (112:4) {#if $user.role === "root"}
    function create_if_block$3(ctx) {
    	let div;
    	let linkbutton;
    	let current;

    	linkbutton = new LinkButton({
    			props: { to: "createUser", label: "Создать фонд" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(linkbutton.$$.fragment);
    			attr_dev(div, "class", "createContainer svelte-1ocrjsp");
    			add_location(div, file$4, 112, 4, 2462);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(linkbutton, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(linkbutton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(linkbutton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(linkbutton);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(112:4) {#if $user.role === \\\"root\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div1;
    	let div0;
    	let input;
    	let t0;
    	let i;
    	let t1;
    	let t2;
    	let div2;
    	let t3;
    	let t4;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*$user*/ ctx[1].role === "root" && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			input = element("input");
    			t0 = space();
    			i = element("i");
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			div2 = element("div");
    			t3 = space();
    			t4 = text(/*error*/ ctx[0]);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Поиск фондов");
    			attr_dev(input, "class", "svelte-1ocrjsp");
    			add_location(input, file$4, 108, 8, 2303);
    			attr_dev(i, "class", "search link icon");
    			add_location(i, file$4, 109, 8, 2381);
    			attr_dev(div0, "class", "ui icon input item");
    			add_location(div0, file$4, 107, 4, 2261);
    			attr_dev(div1, "class", "fundControls inline svelte-1ocrjsp");
    			add_location(div1, file$4, 106, 0, 2222);
    			attr_dev(div2, "id", "tableMountingPoint");
    			add_location(div2, file$4, 117, 0, 2585);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, input);
    			append_dev(div0, t0);
    			append_dev(div0, i);
    			append_dev(div1, t1);
    			if (if_block) if_block.m(div1, null);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div2, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, t4, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*onFilter*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$user*/ ctx[1].role === "root") {
    				if (if_block) {
    					if (dirty & /*$user*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*error*/ 1) set_data_dev(t4, /*error*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(t4);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $fundNames;
    	let $user;
    	validate_store(fundNames, "fundNames");
    	component_subscribe($$self, fundNames, $$value => $$invalidate(5, $fundNames = $$value));
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(1, $user = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Funds", slots, []);
    	let fundInfo;
    	let initFundInfo;
    	let error = "";
    	let localFunds = $fundNames;

    	onMount(async () => {
    		const res = await getFunds();

    		if (res.status === "OK") {
    			fundInfo = res.data;
    			initFundInfo = [...res.data];
    			mountTable();
    		} else {
    			$$invalidate(0, error = res.msg || res);
    		}
    	});

    	function mountTable() {
    		const data = fundInfo.map((row, i) => {
    			row.index = i;
    			return row;
    		});

    		new window.Tabulator("#tableMountingPoint",
    		{
    				layout: "fitDataTable",
    				data,
    				pagination: "local",
    				paginationSize: 25,
    				columns: [
    					{
    						title: "#",
    						field: "index",
    						sorter: "number"
    					},
    					{
    						title: "",
    						field: "id",
    						formatter(cell) {
    							const id = cell._cell.row.data.id;
    							const a = document.createElement("i");
    							a.className = "linkToRow";
    							a.addEventListener("click", () => goTo("/editFund", "id", id));
    							a.innerText = "править";
    							return a;
    						}
    					},
    					{
    						title: "Название",
    						field: "name",
    						sorter: "string"
    					},
    					{
    						title: "Discord",
    						field: "discord",
    						sorter: "string"
    					},
    					{
    						title: "Сайт",
    						field: "site",
    						sorter: "string"
    					}
    				]
    			});
    	}

    	function onFilter(e) {
    		let input = e.target.value;
    		if (!fundInfo) return;

    		if (input.length) {
    			input = input.toLocaleLowerCase();

    			fundInfo = initFundInfo.filter(val => {
    				let { name, site, discord } = val;
    				if (name && name.toLocaleLowerCase().includes(input)) return true;
    				if (site && site.toLocaleLowerCase().includes(input)) return true;
    				if (discord && discord.toLocaleLowerCase().includes(input)) return true;
    			});

    			return mountTable();
    		}

    		fundInfo = initFundInfo;
    		mountTable();
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Funds> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		userRightsTranslation,
    		LinkButton,
    		fundNames,
    		goTo,
    		user,
    		getFunds,
    		fundInfo,
    		initFundInfo,
    		error,
    		localFunds,
    		mountTable,
    		onFilter,
    		$fundNames,
    		$user
    	});

    	$$self.$inject_state = $$props => {
    		if ("fundInfo" in $$props) fundInfo = $$props.fundInfo;
    		if ("initFundInfo" in $$props) initFundInfo = $$props.initFundInfo;
    		if ("error" in $$props) $$invalidate(0, error = $$props.error);
    		if ("localFunds" in $$props) localFunds = $$props.localFunds;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [error, $user, onFilter];
    }

    class Funds extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Funds",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\fund\EditFund.svelte generated by Svelte v3.38.2 */

    const { Object: Object_1$2 } = globals;
    const file$3 = "src\\fund\\EditFund.svelte";

    // (484:22) 
    function create_if_block_2$1(ctx) {
    	let div0;
    	let t;
    	let div1;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t = space();
    			div1 = element("div");
    			attr_dev(div0, "id", "usersTable");
    			add_location(div0, file$3, 484, 4, 12517);
    			attr_dev(div1, "id", "userEditor");
    			add_location(div1, file$3, 485, 4, 12546);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div1, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(484:22) ",
    		ctx
    	});

    	return block;
    }

    // (481:22) 
    function create_if_block_1$1(ctx) {
    	let div0;
    	let t;
    	let div1;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t = space();
    			div1 = element("div");
    			attr_dev(div0, "id", "addUsersForm");
    			add_location(div0, file$3, 481, 4, 12425);
    			attr_dev(div1, "id", "regAndAddUsersForm");
    			add_location(div1, file$3, 482, 4, 12456);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div1, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(481:22) ",
    		ctx
    	});

    	return block;
    }

    // (479:2) {#if tab === 0}
    function create_if_block$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "id", "editGroupForm");
    			add_location(div, file$3, 479, 4, 12369);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(479:2) {#if tab === 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let main;
    	let div;
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let button2;
    	let t5;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*tab*/ ctx[0] === 0) return create_if_block$2;
    		if (/*tab*/ ctx[0] === 1) return create_if_block_1$1;
    		if (/*tab*/ ctx[0] === 2) return create_if_block_2$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "Общая информация";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Добавить участников";
    			t3 = space();
    			button2 = element("button");
    			button2.textContent = "Редактировать участников";
    			t5 = space();
    			if (if_block) if_block.c();
    			add_location(button0, file$3, 473, 4, 12123);
    			add_location(button1, file$3, 474, 4, 12191);
    			add_location(button2, file$3, 475, 4, 12262);
    			attr_dev(div, "class", "navigation");
    			add_location(div, file$3, 472, 2, 12093);
    			add_location(main, file$3, 471, 0, 12083);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			append_dev(div, button0);
    			append_dev(div, t1);
    			append_dev(div, button1);
    			append_dev(div, t3);
    			append_dev(div, button2);
    			append_dev(main, t5);
    			if (if_block) if_block.m(main, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[2], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[3], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(main, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);

    			if (if_block) {
    				if_block.d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $user;
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(11, $user = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("EditFund", slots, []);
    	const params = new URLSearchParams(window.location.search);
    	const id = params.get("id");
    	let tab = 0;
    	let error = "";

    	let options = [
    		{ label: "Менеджер", value: "manager" },
    		{
    			label: "Обычный пользователь",
    			value: "user"
    		},
    		{
    			label: "Только чтение",
    			value: "readonly"
    		}
    	];

    	let groupInfo;
    	const usersObj = {};
    	let currentUser;
    	let selectedUser;
    	let prevRole;

    	function mountForm() {
    		const formConfig = {
    			fields: {
    				name: { label: "Название", required: true },
    				email: { label: "E-mail", type: "email" },
    				skype: { label: "Skype" },
    				site: { label: "Сайт" },
    				discord: { label: "Сервер discord" },
    				owner: {
    					label: "Создатель",
    					hint: "Начните вводить имя или e-mail",
    					options: [
    						{
    							name: groupInfo.owner.label || "",
    							id: groupInfo.owner.value || ""
    						}
    					],
    					type: "select",
    					async onKeyDown(fb, c, val) {
    						if (val && val.length > 2) {
    							const res = await getUsersByQuery(val);

    							// TBC
    							if (res.status === "OK") {
    								res.data.forEach(opt => opt.name = opt.username);
    								fb.fields.owner.options = res.data;
    								if (res.data.length) c.$refs.input.blur();
    							}
    						}
    					},
    					onInput(fb, c, val) {
    						const res = fb.fields.owner.options.find(opt => opt.id === val);
    						currentUser = res;
    					}
    				},
    				msg: { type: "html", value: "" }
    			},
    			methods: {
    				async onSubmit(fb, comp, data) {
    					if (data.owner && data.owner !== groupInfo.owner.value) {
    						const res = await updateFundOwner(groupInfo.id, data.owner, groupInfo.owner.value);

    						if (res.status === "OK") {
    							// Update local data of group and user info
    							groupInfo.owner = currentUser;

    							currentUser = null;
    							usersObj[data.owner] = "owner";
    							if (usersObj[groupInfo.owner.value]) delete usersObj[groupInfo.owner.value];
    						}

    						fb.fields.msg.value = res.msg || res;
    					}

    					const cleaned = {};

    					for (const [key, value] of Object.entries(data)) {
    						if (value !== "" && key !== "owner") cleaned[key] = value;
    					}

    					const res = await updateFundForm(groupInfo.id, cleaned);

    					if (res.status === "OK") {
    						delete data.owner;
    						groupInfo = { ...groupInfo, ...data };
    					}

    					fb.fields.msg.value = res.msg;
    				}
    			}
    		};

    		window.callForm2(
    			"#editGroupForm",
    			{
    				...groupInfo,
    				owner: groupInfo.owner.value
    			},
    			formConfig
    		);
    	}

    	function mountAddUser() {
    		const formConfig = {
    			title: "Добавить зарегистрированных участников",
    			fields: {
    				user: {
    					label: "Логин, discord или e-mail",
    					hint: "Начните вводить логин, discord или e-mail (мин. 3 символа)",
    					options: [{ name: "", id: "" }],
    					type: "select",
    					async onKeyDown(fb, c, val) {
    						if (val && val.length > 2) {
    							const res = await getUsersByQuery(val);

    							// TBC
    							if (res.status === "OK") {
    								res.data.forEach(opt => opt.name = opt.username);
    								fb.fields.user.options = res.data;
    								if (res.data.length) c.$refs.input.blur();
    							}
    						}
    					},
    					onInput(fb, c, val) {
    						const res = fb.fields.user.options.find(opt => opt.id === val);
    						currentUser = res;
    					}
    				},
    				role: {
    					label: "Роль",
    					options,
    					type: "select",
    					required: true
    				},
    				msg: { type: "html", value: "", service: true }
    			},
    			methods: {
    				async onSubmit(fb, comp, data) {
    					// Check if user exists
    					if (usersObj[data.user]) {
    						fb.fields.msg.value = "Пользователь уже добавлен, перейдите во вкладку редактирования";
    						return;
    					}

    					const res = await addUserToFund(data.user, data.role, groupInfo.id);

    					if (res.status === "OK") {
    						groupInfo[data.role + "s"].push({
    							label: currentUser.name,
    							value: currentUser.id
    						});

    						usersObj[data.user] = data.role;
    						await groupRequest();
    					}

    					fb.fields.msg.value = res.msg || res;
    				}
    			},
    			buttons: {
    				submit: { label: "Добавить", color: "primary" }
    			}
    		};

    		window.callForm2("#addUsersForm", {}, formConfig);
    	}

    	function mountRegAndConfig() {
    		// Register and add
    		const regOptions = [{ id: "guest", name: "Обычный" }];

    		if ($user.role === "root") regOptions.unshift({ id: "root", name: "root" });

    		const formRegConfig = {
    			title: "Зарегистрировать и добавить участников",
    			fields: {
    				login: { label: "Логин" },
    				name: { label: "Имя пользователя" },
    				discord: { label: "Ник discord" },
    				email: {
    					label: "E-mail",
    					type: "email",
    					rules: [
    						val => val == false || Boolean(val.includes("@") && val.includes(".")) || "неверный формат e-mail"
    					]
    				},
    				password: {
    					label: "Пароль",
    					type: "password",
    					rules: [val => val.length > 5 || "введите минимум 6 символов"],
    					required: true
    				},
    				role: {
    					label: "Роль на сайте",
    					type: "select",
    					autocomplete: false,
    					options: regOptions,
    					value: "guest",
    					visible: $user.role === "root",
    					required: true
    				},
    				groupRole: {
    					label: "Роль в фонде",
    					type: "select",
    					options: [
    						{ name: "Менеджер", id: "manager" },
    						{ name: "Обычный", id: "user" },
    						{ name: "Только чтение", id: "readonly" }
    					],
    					required: true
    				},
    				msg: { type: "html", value: "", service: true }
    			},
    			methods: {
    				async onSubmit(fb, comp, data) {
    					if (!data.login && !data.discord && !data.email) {
    						fb.fields.msg.value = "Введите логин, или discord или email";
    						return;
    					}

    					const cleaned = {};

    					for (const [key, value] of Object.entries(data)) {
    						if (value !== "" && key !== "groupRole") cleaned[key] = value;
    					}

    					const createResponse = await createUser(cleaned);

    					if (createResponse.status !== "OK") {
    						return false;
    					}

    					fb.fields.msg.value = createResponse.msg || createResponse;
    					const createdUser = createResponse.data;
    					$user.children.push(createdUser.id);
    					const response = await addUserToFund(createdUser.id, data.groupRole, groupInfo.id);

    					if (response.status === "OK") {
    						groupInfo[data.groupRole + "s"].push({
    							label: createdUser.name,
    							value: createdUser.id
    						});

    						usersObj[createdUser.id] = data.groupRole;
    						await groupRequest();
    					}

    					fb.fields.msg.value = response.msg || response;
    				}
    			},
    			buttons: {
    				submit: {
    					label: "Создать и добавить",
    					color: "primary"
    				}
    			}
    		};

    		window.callForm2("#regAndAddUsersForm", {}, formRegConfig);
    	}

    	function mountUserTable() {
    		const users = [...groupInfo.managers, ...groupInfo.users, ...groupInfo.readonlys];
    		const filtered = users.filter(userObj => userObj.id !== $user.id);

    		new Tabulator("#usersTable",
    		{
    				layout: "fitDataTable",
    				data: filtered,
    				pagination: "local",
    				paginationSize: 15,
    				columns: [
    					{
    						title: "Имя пользователя",
    						field: "username",
    						sorter: "string"
    					},
    					{
    						title: "Логин",
    						field: "login",
    						sorter: "string"
    					},
    					{
    						title: "Ник discord",
    						field: "discord",
    						sorter: "string"
    					},
    					{
    						title: "E-mail",
    						field: "email",
    						sorter: "string"
    					},
    					{
    						title: "Роль",
    						field: "role",
    						sorter: "string",
    						formatter(cell) {
    							const role = usersObj[cell._cell.row.data.id];
    							return userRightsTranslation[role];
    						}
    					},
    					{
    						title: "",
    						field: "id",
    						formatter(cell) {
    							const role = usersObj[cell._cell.row.data.id];
    							const a = document.createElement("button");
    							a.className = "linkToRow";

    							a.addEventListener("click", () => {
    								selectedUser = { ...cell._cell.row.data, role };
    								prevRole = role;
    								error = "";
    								mountUserEditor();
    							});

    							a.innerText = "выбрать";
    							return a;
    						}
    					}
    				]
    			});
    	}

    	function mountUserEditor() {
    		const config = {
    			fields: {
    				role: {
    					row: 1,
    					type: "select",
    					label: "Выберете новую роль",
    					options: options.filter(o => o.value !== prevRole),
    					required: true
    				},
    				deleteUser: {
    					type: "button",
    					label: "или",
    					value: "Удалите пользователя",
    					color: "red",
    					size: "sm",
    					async onClick(fb) {
    						const res = await deleteFromFund(selectedUser.id, groupInfo.id, prevRole);
    						fb.fields.msg.value = res.msg || res;

    						if (res.status === "OK") {
    							delete usersObj[selectedUser.id];
    							await groupRequest();
    							mountUserTable();
    							fb.modal.closeModal();
    						}
    					}
    				},
    				msg: { type: "html", value: "" }
    			},
    			methods: {
    				async onSubmit(fb, c, data) {
    					const res = await updateUserRole(selectedUser.id, data.role, prevRole, groupInfo.id);
    					fb.fields.msg.value = res.msg || res;

    					if (res.status === "OK") {
    						await groupRequest();
    						mountUserTable();
    					}
    				}
    			},
    			modal: true,
    			buttons: {
    				submit: { label: "Обновить роль", color: "primary" }
    			},
    			title: "Редактирование пользователя " + selectedUser.username
    		};

    		window.callForm2("#userEditor", {}, config);
    	}

    	async function groupRequest() {
    		const response = await getFundFormated(id);

    		if (response.status === "OK") {
    			groupInfo = response.data;

    			// Set users 
    			groupInfo.owner?.value && (usersObj[groupInfo.owner.value] = "owner");

    			groupInfo.managers.forEach(e => usersObj[e.value] = "manager");
    			groupInfo.users.forEach(e => usersObj[e.value] = "user");
    			groupInfo.readonlys.forEach(e => usersObj[e.value] = "readonly");
    			return groupInfo;
    		} else error = response.msg || response;
    	}

    	

    	async function tabClick(number = 0) {
    		$$invalidate(0, tab = number);
    		error = "";
    		await tick();
    		if (number === 0) return mountForm();
    		if (number === 1) return mountAddUser() || mountRegAndConfig();
    		if (number === 2) return mountUserTable();
    	}

    	onMount(async () => {
    		const res = await groupRequest();
    		if (res) mountForm();
    	});

    	const writable_props = [];

    	Object_1$2.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<EditFund> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => tabClick(0);
    	const click_handler_1 = () => tabClick(1);
    	const click_handler_2 = () => tabClick(2);

    	$$self.$capture_state = () => ({
    		onMount,
    		tick,
    		user,
    		createUser,
    		getUsersByQuery,
    		getFundFormated,
    		updateFundOwner,
    		updateFundForm,
    		addUserToFund,
    		updateUserRole,
    		deleteFromFund,
    		userRightsTranslation,
    		params,
    		id,
    		tab,
    		error,
    		options,
    		groupInfo,
    		usersObj,
    		currentUser,
    		selectedUser,
    		prevRole,
    		mountForm,
    		mountAddUser,
    		mountRegAndConfig,
    		mountUserTable,
    		mountUserEditor,
    		groupRequest,
    		tabClick,
    		$user
    	});

    	$$self.$inject_state = $$props => {
    		if ("tab" in $$props) $$invalidate(0, tab = $$props.tab);
    		if ("error" in $$props) error = $$props.error;
    		if ("options" in $$props) options = $$props.options;
    		if ("groupInfo" in $$props) groupInfo = $$props.groupInfo;
    		if ("currentUser" in $$props) currentUser = $$props.currentUser;
    		if ("selectedUser" in $$props) selectedUser = $$props.selectedUser;
    		if ("prevRole" in $$props) prevRole = $$props.prevRole;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [tab, tabClick, click_handler, click_handler_1, click_handler_2];
    }

    class EditFund extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EditFund",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\table\CreateNote.svelte generated by Svelte v3.38.2 */

    const { Object: Object_1$1 } = globals;
    const file$2 = "src\\table\\CreateNote.svelte";

    function create_fragment$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "id", "createNoteForm");
    			add_location(div, file$2, 261, 0, 5578);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $user;
    	let $fundNames;
    	let $fundRights;
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(0, $user = $$value));
    	validate_store(fundNames, "fundNames");
    	component_subscribe($$self, fundNames, $$value => $$invalidate(1, $fundNames = $$value));
    	validate_store(fundRights, "fundRights");
    	component_subscribe($$self, fundRights, $$value => $$invalidate(2, $fundRights = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CreateNote", slots, []);
    	let creatableGroups = [];

    	function mountForm() {
    		const formConfig = {
    			fields: {
    				author: {
    					label: "Создать от имени",
    					type: "select",
    					options: creatableGroups,
    					required: true
    				},
    				// Rest info
    				case: {
    					label: "Арбитраж",
    					type: "multiple",
    					value: [],
    					settings: {
    						arbitrage: { label: "Арбитраж", row: 1 },
    						descr: {
    							label: "Описание",
    							type: "textarea",
    							row: 1
    						},
    						amount: { label: "Размер", row: 1 }
    					}
    				},
    				nickname: {
    					label: "Дисциплины",
    					type: "multiple",
    					value: [],
    					settings: {
    						discipline: { label: "Дисциплина", row: 1 },
    						room: { label: "Room", row: 1 },
    						value: { label: "Nick", row: 1 }
    					}
    				},
    				horizont: {
    					type: "html",
    					value: "<div class=\"filler\"/>"
    				},
    				nicknameOld: {
    					label: "Архивные значения",
    					type: "textarea",
    					visible: false
    				},
    				FIO: {
    					label: "ФИО",
    					type: "multiple",
    					value: [],
    					settings: {
    						firstname: { label: "Имя", row: 1 },
    						lastname: { label: "Фамилия", row: 1 },
    						middlename: { label: "Отчество", row: 1 }
    					}
    				},
    				horizont2: {
    					type: "html",
    					value: "<hr class=\"q-ma-none q-pa-none\"/>"
    				},
    				htmlHint: {
    					type: "html",
    					value: "Добавляйте значения при помощи клавиши 'enter'"
    				},
    				gipsyteam: {
    					label: "Gipsy team",
    					type: "creatable",
    					outlined: true
    				},
    				skype: {
    					label: "Аккаунты Skype",
    					type: "creatable",
    					outlined: true
    				},
    				skrill: {
    					label: "Аккаунты skrill",
    					type: "creatable",
    					outlined: true
    				},
    				neteller: {
    					label: "Аккаунты neteller",
    					type: "creatable",
    					outlined: true
    				},
    				phone: {
    					label: "Телефоны",
    					type: "creatable",
    					outlined: true
    				},
    				pokerstrategy: {
    					label: "Poker Strategy",
    					type: "creatable",
    					outlined: true
    				},
    				google: {
    					label: "Google аккаунты",
    					type: "creatable",
    					outlined: true
    				},
    				mail: {
    					label: "Адреса e-mail",
    					type: "creatable",
    					outlined: true
    				},
    				vk: {
    					label: "Аккаунты vkontakte",
    					type: "creatable",
    					outlined: true
    				},
    				facebook: {
    					label: "Аккаунты facebook",
    					type: "creatable",
    					outlined: true
    				},
    				blog: {
    					label: "Блоги",
    					type: "creatable",
    					outlined: true
    				},
    				instagram: {
    					label: "Аккаунты instagram",
    					type: "creatable",
    					outlined: true
    				},
    				forum: {
    					label: "Форумы",
    					type: "creatable",
    					outlined: true
    				},
    				ecopayz: {
    					label: "Аккаунты ecopayz",
    					type: "creatable",
    					outlined: true
    				},
    				location: {
    					label: "Адреса",
    					type: "multiple",
    					value: [],
    					settings: {
    						country: { label: "Страна", row: 1 },
    						town: { label: "Город", row: 1 },
    						address: { label: "Адрес", row: 1 }
    					}
    				},
    				webmoney: {
    					label: "Аккаунты Webmoney",
    					type: "multiple",
    					value: [],
    					settings: {
    						WMID: { row: 1, label: "WMID", required: true },
    						wallets: {
    							label: "Кошельки",
    							type: "creatable",
    							row: 1
    						}
    					}
    				},
    				comments: { label: "Комментарии", type: "textarea" },
    				msg: { type: "html", value: "" }
    			},
    			methods: {
    				async onSubmit(fb, comp, data) {
    					fb.fields.msg.value = "";
    					const req = {};

    					for (const [key, value] of Object.entries({ ...data })) {
    						if (value !== "") {
    							req[key] = value;
    						}
    					}

    					const response = await createNote(req);
    					fb.fields.msg.value = response.msg;
    				}
    			},
    			title: "Создать запись о репутации игрока"
    		};

    		window.callForm2("#createNoteForm", {}, formConfig);
    	}

    	

    	onMount(async () => {
    		if ($user.role === "root") {
    			Object.entries($fundNames).forEach(([id, name]) => creatableGroups.push({ id, name }));
    			return mountForm();
    		}

    		for (const [id, value] of Object.entries($fundRights)) {
    			if (value === "owner" || value === "manager" || value === "user") creatableGroups.push({ id, name: $fundNames[id] });
    		}

    		mountForm();
    	});

    	const writable_props = [];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CreateNote> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		fundNames,
    		fundRights,
    		user,
    		createNote,
    		creatableGroups,
    		mountForm,
    		$user,
    		$fundNames,
    		$fundRights
    	});

    	$$self.$inject_state = $$props => {
    		if ("creatableGroups" in $$props) creatableGroups = $$props.creatableGroups;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class CreateNote extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CreateNote",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\table\EditNote.svelte generated by Svelte v3.38.2 */

    const { Object: Object_1, console: console_1 } = globals;

    const file$1 = "src\\table\\EditNote.svelte";

    // (292:2) {#if error}
    function create_if_block$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*error*/ ctx[0]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*error*/ 1) set_data_dev(t, /*error*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(292:2) {#if error}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let t;
    	let div;
    	let if_block = /*error*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t = space();
    			div = element("div");
    			attr_dev(div, "id", "createNoteForm");
    			add_location(div, file$1, 294, 2, 7102);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*error*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $user;
    	let $fundNames;
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(1, $user = $$value));
    	validate_store(fundNames, "fundNames");
    	component_subscribe($$self, fundNames, $$value => $$invalidate(2, $fundNames = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("EditNote", slots, []);
    	let creatableGroups = [];
    	let error = "";
    	const params = new URLSearchParams(window.location.search);
    	const id = params.get("id");

    	function mountForm(data) {
    		console.log("%c⧭", "color: #7f7700", data);

    		const formConfig = {
    			fields: {
    				author: {
    					label: "Автор",
    					type: "select",
    					options: creatableGroups,
    					required: true,
    					disabled: true
    				},
    				// Rest info
    				case: {
    					label: "Арбитраж",
    					type: "multiple",
    					value: [],
    					settings: {
    						arbitrage: { label: "Арбитраж", row: 1 },
    						descr: {
    							label: "Описание",
    							type: "textarea",
    							row: 1
    						},
    						amount: { label: "Размер", row: 1 }
    					}
    				},
    				nickname: {
    					label: "Дисциплины",
    					type: "multiple",
    					value: [],
    					settings: {
    						discipline: { label: "Дисциплина", row: 1 },
    						room: { label: "Room", row: 1 },
    						value: { label: "Nick", row: 1 }
    					}
    				},
    				horizont: {
    					type: "html",
    					value: "<div class=\"filler\"/>"
    				},
    				nicknameOld: {
    					label: "Архивные значения",
    					type: "textarea",
    					visible: false
    				},
    				FIO: {
    					label: "ФИО",
    					type: "multiple",
    					value: [],
    					settings: {
    						firstname: { label: "Имя", row: 1 },
    						lastname: { label: "Фамилия", row: 1 },
    						middlename: { label: "Отчество", row: 1 }
    					}
    				},
    				horizont2: {
    					type: "html",
    					value: "<hr class=\"q-ma-none q-pa-none\"/>"
    				},
    				htmlHint: {
    					type: "html",
    					value: "Добавляйте значения при помощи клавиши 'enter'"
    				},
    				gipsyteam: {
    					label: "Gipsy team",
    					type: "creatable",
    					outlined: true
    				},
    				skype: {
    					label: "Аккаунты Skype",
    					type: "creatable",
    					outlined: true
    				},
    				skrill: {
    					label: "Аккаунты skrill",
    					type: "creatable",
    					outlined: true
    				},
    				neteller: {
    					label: "Аккаунты neteller",
    					type: "creatable",
    					outlined: true
    				},
    				phone: {
    					label: "Телефоны",
    					type: "creatable",
    					outlined: true
    				},
    				pokerstrategy: {
    					label: "Poker Strategy",
    					type: "creatable",
    					outlined: true
    				},
    				google: {
    					label: "Google аккаунты",
    					type: "creatable",
    					outlined: true
    				},
    				mail: {
    					label: "Адреса e-mail",
    					type: "creatable",
    					outlined: true
    				},
    				vk: {
    					label: "Аккаунты vkontakte",
    					type: "creatable",
    					outlined: true
    				},
    				facebook: {
    					label: "Аккаунты facebook",
    					type: "creatable",
    					outlined: true
    				},
    				blog: {
    					label: "Блоги",
    					type: "creatable",
    					outlined: true
    				},
    				instagram: {
    					label: "Аккаунты instagram",
    					type: "creatable",
    					outlined: true
    				},
    				forum: {
    					label: "Форумы",
    					type: "creatable",
    					outlined: true
    				},
    				ecopayz: {
    					label: "Аккаунты ecopayz",
    					type: "creatable",
    					outlined: true
    				},
    				location: {
    					label: "Адреса",
    					type: "multiple",
    					value: [],
    					settings: {
    						country: { label: "Страна", row: 1 },
    						town: { label: "Город", row: 1 },
    						address: { label: "Адрес", row: 1 }
    					}
    				},
    				webmoney: {
    					label: "Аккаунты Webmoney",
    					type: "multiple",
    					value: [],
    					settings: {
    						WMID: { row: 1, label: "WMID", required: true },
    						wallets: {
    							label: "Кошельки",
    							type: "creatable",
    							row: 1
    						}
    					}
    				},
    				comments: { label: "Комментарии", type: "textarea" },
    				old: {
    					type: "checkbox",
    					label: "Архивная запись",
    					hint: "снимите флажок, если запись была отредактирована в новый формат"
    				},
    				delButton: {
    					value: "Удалить запись",
    					type: "button",
    					visible: $user.role === "root",
    					color: "red",
    					async onClick(fb) {
    						const res = await deleteNote(id);
    						fb.fields.msg.value = res.msg || res;
    					}
    				},
    				msg: { type: "html", value: "" }
    			},
    			methods: {
    				async onSubmit(fb, comp, data) {
    					fb.fields.msg.value = "";
    					const req = {};

    					for (const [key, value] of Object.entries({ ...data })) {
    						if (value !== "") {
    							req[key] = value;
    						}
    					}

    					const response = await updateNote(req, id);
    					fb.fields.msg.value = response.msg;
    				}
    			},
    			title: "Редактировать запись о репутации игрока",
    			buttons: {
    				submit: { label: "Обновить", color: "primary" }
    			}
    		};

    		window.callForm2("#createNoteForm", data, formConfig);
    	}

    	

    	onMount(async () => {
    		const res = await getNote(id);
    		if (res.status !== "OK") return $$invalidate(0, error = res.msg || res);

    		// if ($user.role === 'root') {
    		Object.entries($fundNames).forEach(([id, name]) => creatableGroups.push({ id, name }));

    		mountForm(res.data);
    	}); // }
    	// for (const [id, value] of Object.entries($fundRights)) {
    	//   if (value === "owner" || value === "manager" || value === "user")
    	//     creatableGroups.push({

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<EditNote> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		fundNames,
    		fundRights,
    		user,
    		createNote,
    		deleteNote,
    		getNote,
    		updateNote,
    		creatableGroups,
    		error,
    		params,
    		id,
    		mountForm,
    		$user,
    		$fundNames
    	});

    	$$self.$inject_state = $$props => {
    		if ("creatableGroups" in $$props) creatableGroups = $$props.creatableGroups;
    		if ("error" in $$props) $$invalidate(0, error = $$props.error);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [error];
    }

    class EditNote extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EditNote",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.38.2 */
    const file = "src\\App.svelte";

    // (73:2) {:else}
    function create_else_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("404");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(73:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (71:30) 
    function create_if_block_10(ctx) {
    	let table;
    	let current;
    	table = new Table({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(table.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(table, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(table.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(table.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(table, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(71:30) ",
    		ctx
    	});

    	return block;
    }

    // (69:35) 
    function create_if_block_9(ctx) {
    	let funds;
    	let current;
    	funds = new Funds({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(funds.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(funds, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(funds.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(funds.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(funds, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(69:35) ",
    		ctx
    	});

    	return block;
    }

    // (67:35) 
    function create_if_block_8(ctx) {
    	let users;
    	let current;
    	users = new Users({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(users.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(users, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(users.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(users.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(users, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(67:35) ",
    		ctx
    	});

    	return block;
    }

    // (65:38) 
    function create_if_block_7(ctx) {
    	let editnote;
    	let current;
    	editnote = new EditNote({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(editnote.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(editnote, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(editnote.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(editnote.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(editnote, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(65:38) ",
    		ctx
    	});

    	return block;
    }

    // (63:38) 
    function create_if_block_6(ctx) {
    	let editfund;
    	let current;
    	editfund = new EditFund({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(editfund.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(editfund, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(editfund.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(editfund.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(editfund, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(63:38) ",
    		ctx
    	});

    	return block;
    }

    // (61:38) 
    function create_if_block_5(ctx) {
    	let edituser;
    	let current;
    	edituser = new EditUser({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(edituser.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(edituser, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(edituser.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(edituser.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(edituser, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(61:38) ",
    		ctx
    	});

    	return block;
    }

    // (59:40) 
    function create_if_block_4(ctx) {
    	let createnote;
    	let current;
    	createnote = new CreateNote({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(createnote.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(createnote, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(createnote.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(createnote.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(createnote, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(59:40) ",
    		ctx
    	});

    	return block;
    }

    // (57:40) 
    function create_if_block_3(ctx) {
    	let createuser;
    	let current;
    	createuser = new CreateUser({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(createuser.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(createuser, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(createuser.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(createuser.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(createuser, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(57:40) ",
    		ctx
    	});

    	return block;
    }

    // (55:40) 
    function create_if_block_2(ctx) {
    	let createfund;
    	let current;
    	createfund = new CreateFund({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(createfund.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(createfund, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(createfund.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(createfund.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(createfund, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(55:40) ",
    		ctx
    	});

    	return block;
    }

    // (53:24) 
    function create_if_block_1(ctx) {
    	let login;
    	let current;
    	login = new Login({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(login.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(login, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(login.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(login.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(login, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(53:24) ",
    		ctx
    	});

    	return block;
    }

    // (51:2) {#if !isLoaded}
    function create_if_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Loading...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(51:2) {#if !isLoaded}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let navbar;
    	let t;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	navbar = new Navbar({ $$inline: true });

    	const if_block_creators = [
    		create_if_block,
    		create_if_block_1,
    		create_if_block_2,
    		create_if_block_3,
    		create_if_block_4,
    		create_if_block_5,
    		create_if_block_6,
    		create_if_block_7,
    		create_if_block_8,
    		create_if_block_9,
    		create_if_block_10,
    		create_else_block
    	];

    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*isLoaded*/ ctx[0]) return 0;
    		if (!/*$user*/ ctx[1].role) return 1;
    		if (/*$location*/ ctx[2] === "/createFund") return 2;
    		if (/*$location*/ ctx[2] === "/createUser") return 3;
    		if (/*$location*/ ctx[2] === "/createNote") return 4;
    		if (/*$location*/ ctx[2] === "/editUser") return 5;
    		if (/*$location*/ ctx[2] === "/editFund") return 6;
    		if (/*$location*/ ctx[2] === "/editNote") return 7;
    		if (/*$location*/ ctx[2] === "/users") return 8;
    		if (/*$location*/ ctx[2] === "/funds") return 9;
    		if (/*$location*/ ctx[2] === "/") return 10;
    		return 11;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(navbar.$$.fragment);
    			t = space();
    			if_block.c();
    			add_location(main, file, 45, 0, 1349);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(navbar, main, null);
    			append_dev(main, t);
    			if_blocks[current_block_type_index].m(main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(main, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(navbar);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $user;
    	let $location;
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(1, $user = $$value));
    	validate_store(location, "location");
    	component_subscribe($$self, location, $$value => $$invalidate(2, $location = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let isLoaded = false;

    	// Start by requesting user info
    	(async function init() {
    		const res = await refresh();
    		$$invalidate(0, isLoaded = true);

    		if (res.status = "OK") {
    			res.data.userProps?.funds && fundRights.set(res.data.userProps.funds);
    			const objectOfNames = {};
    			res.data.fundNames.length && res.data.fundNames.forEach(({ id, name }) => objectOfNames[id] = name);
    			fundNames.set(objectOfNames);
    			set_store_value(user, $user = res.data.user, $user);
    			if (res.data.userProps?.children) set_store_value(user, $user.children = res.data.userProps.children, $user);
    			return;
    		}

    		goTo("/login");
    	})();

    	// Catch initial location
    	location.set(window.location.pathname);

    	// Catch back and forward buttons
    	window.onpopstate = function (e) {
    		location.set("/" + e.state);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Navbar,
    		refresh,
    		fundNames,
    		fundRights,
    		goTo,
    		location,
    		user,
    		CreateFund,
    		Login,
    		Table,
    		Users,
    		CreateUser,
    		EditUser,
    		Funds,
    		EditFund,
    		CreateNote,
    		EditNote,
    		isLoaded,
    		$user,
    		$location
    	});

    	$$self.$inject_state = $$props => {
    		if ("isLoaded" in $$props) $$invalidate(0, isLoaded = $$props.isLoaded);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [isLoaded, $user, $location];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app$1 = new App({
    	target: document.getElementById('sveltePoint'),
    });

    return app$1;

}());
