exports.install = function () {
  ROUTE('GET /api/table', getTable);
  ROUTE('POST /api/table/create', createNote);
  ROUTE('GET /api/table/note', getNote);
  ROUTE('DELETE /api/table/note', deleteNote);
  ROUTE('PUT /api/table/update', updateNote);

};

async function getTable() {
  const req = this
  // const { query, order } = req.query

  const page = req.query.page - 1 || 0  // tabulator starts page count from 1
  const limit = req.query.limit || req.query.size || 25 // or 'size'
  let where = req.query.where || ""  //TODO
  const order = req.query.order || "desc"
  const field = req.query.field || 'created'
  const { author } = req.query

  // Regex corrections
  // where = where.replace('*', '\\*')

  // if (where && req.query?.id) {
  //   var table = await TRow.find({ author: req.query?.id }).find({ $or: queryMonster }).sort({ [field]: order }).skip(page * limit).limit(Number(limit))
  //   totalCount = await TRow.find({ author: req.query?.id }).find({ $or: queryMonster }).countDocuments((e, r) => totalCount = r)
  //   last_page = totalCount ? Math.floor(totalCount / limit) : 1
  // } else if (where) {
  //   var table = await TRow.find({ $or: queryMonster }).sort({ [field]: order }).skip(page * limit).limit(Number(limit))
  //   totalCount = await TRow.find({ $or: queryMonster }).countDocuments((e, r) => totalCount = r)
  //   last_page = totalCount ? Math.floor(totalCount / limit) : 1
  // } else if (req.query?.id) {
  //   var table = await TRow.find({ author: req.query?.id }).sort({ [field]: order }).skip(page * limit).limit(Number(limit))
  //   totalCount = await TRow.find({ author: req.query?.id }).countDocuments((e, r) => totalCount = r)
  //   last_page = totalCount ? Math.floor(totalCount / limit) : 1
  // } else {
  if (where || author) {
    const table = await NOSQL('arbitrages').find()
      .sort(field + "_" + order)
      .join('_children', 'arb-history').on('id', 'id')
      // .rule('doc.FIO[0].lastname.includes(arg.where)', { where }).
      // .skip(page * limit).sort(field + "_" + order).take(Number(limit))
      .promise(res => {
        let ret = res.findAll(i => JSON.stringify(i).toLocaleLowerCase().includes(where?.toLocaleLowerCase()))
        if (author) ret = ret.findAll(i => i.author === author)
        return ret
      })
    // await table.skip(page * limit).take(Number(limit)) //not working
    
    const res = table.splice(page * limit, Number(limit))
    res.forEach(e => !e._children[0] ? delete e._children : null);
    const count = table.length
    last_page = count ? Math.floor(count / limit) : 1
    return this.json({ status: 'OK', last_page, data: res })
  }
  const table = await NOSQL('arbitrages').find()
    .skip(page * limit).sort(field + "_" + order).take(Number(limit))
    .join('_children', 'arb-history').on('id', 'id')
    .promise()
  // Delete empty _children  
  table.forEach(e => !e._children[0] ? delete e._children : null);
  const { count } = await NOSQL('arbitrages').count().promise()

  last_page = count ? Math.floor(count / limit) : 1
  this.json({ status: 'OK', last_page, data: table })
}

async function createNote() {
  const $ = this
  const data = $.body
  if (!data.author) {
    return $.json({ status: 'ERR', msg: 'Введите создателя записи' })
  }

  // Add attributes
  const id = UID()
  data.id = id
  const created = new Date().toISOString()
  data.created = created
  data.updated = created

  // Insert fund
  const builder = await NOSQL('arbitrages')
    // .insert({ ...data }, true)
    .insert(data, true)
    .where('id', id)
    .promise()
  if (!builder) return $.json({ status: 'ERR', msg: 'проблемы при создании записи, id: ' + id })
  $.json({ status: 'OK', msg: 'Запись создана' })
}

async function getNote() {
  const $ = this
  const { id } = $.query
  if (!id) return $.json({ status: 'ERR', msg: 'Отсутствует идентификатор записи' })

  const res = await NOSQL('arbitrages').one().id(id).promise()
  if (!res) return $.json({ status: 'ERR', msg: "Неверный идентификатор записи или запись не существует" })
  $.json({ status: 'OK', data: res })
}

async function deleteNote() {
  const $ = this
  const { id } = $.query
  if (!id) return $.json({ status: 'ERR', msg: 'Отсутствует идентификатор записи' })
  if ($.user.role !== 'root') return $.json({ status: 'REAUTH', msg: 'Недостаточно прав для удаления записи' })


  const res = await NOSQL('arbitrages').remove().id(id).promise()
  if (!res) return $.json({ status: 'ERR', msg: "Ошибка при удалении" })
  $.json({ status: 'OK', msg: 'Запись удалена' })
}

async function updateNote() {
  const $ = this
  const { id, data } = $.body
  if (!id) return $.json({ status: 'ERR', msg: 'Отсутствует идентификатор записи' })
  if (!data) return $.json({ status: 'ERR', msg: 'Отсутствует наполнение записи' })

  const previousNote = await NOSQL('arbitrages').one().id(id).promise()
  if (!previousNote) return $.json({ status: 'ERR', msg: 'Неверный идентификатор записи или запись не существует' })
  previousNote.history = true
  const copied = await NOSQL('arb-history').insert(previousNote, false).promise()
  if (!copied) return $.json({ status: 'ERR', msg: 'Непредвиденная ошибка архивирования записи' })

  const updated = new Date().toISOString()
  data.updated = updated
  const modify = await NOSQL('arbitrages').modify(data).id(id).promise()
  if (!modify) return $.json({ status: 'ERR', msg: 'Непредвиденная ошибка обновления записи' })

  $.json({ status: 'OK', msg: 'Запись обновлена' })
}