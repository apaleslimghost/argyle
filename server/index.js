const express = require('express')

const app = express()

app.use(express.static('client'))
app.use('/common', express.static('common'))

app.listen(3030, () => console.log(`listening on http://localhost:3030`))
