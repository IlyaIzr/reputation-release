if (RELEASE) {
  NOSQL("arb-history").clean(() => console.log("arb-history clean"));
  NOSQL("arbitrages").clean(() => console.log("arbitrages clean"));
  NOSQL("funds").clean(() => console.log("funds clean"));
  NOSQL("userprops").clean(() => console.log("userprops clean"));
  NOSQL("users").clean(() => console.log("users clean"));
}

const cookieOptions = {
  name: CONF.cookie, // A cookie name
  key: CONF.cookie_secret, // A cookie secret key
  expire: "3 days", // Optional, after read can be updated expiration
};
DEF.cookieOptions = cookieOptions;
