const express = require('express')
const SSE = require('express-sse')
const bodyParser = require('body-parser')
const util = require('util')
const { WebClient } = require('@slack/web-api')
const { Readable } = require('stream')

const sse = new SSE([])
const slack = new WebClient(process.env.SLACK_BOT_TOKEN)
const app = express()

app.use(express.static('client'))
app.use('/common', express.static('common'))

app.get('/events', (req, res, next) => { res.flush = () => {}; next() }, sse.init)

app.get('/image',  async (req, res, next) => {
	const url = req.query.url
	// if(url.host !== 'files.slack.com') {
	// 	return res.sendStatus(400)
	// }

	const image = await fetch(url, {
		headers: {
			'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
		}
	})

	if(!image.ok) {
		throw new Error(image.statusText)
	}

	res.set('content-type', image.headers.get('content-type'))
	Readable.fromWeb(image.body).pipe(res)
})

let emojiList
async function getEmoji(name) {
	if(!emojiList) {
		emojiList = (await slack.emoji.list()).emoji
	}

	return emojiList[name]
}

async function decorateElement(element) {
	const promises = []

	if(element.elements) {
		promises.push(decorateElements(element.elements))
	}

	switch(element.type) {
		case 'channel':
			promises.push(
				slack.conversations.info({ channel: element.channel_id }).then(({channel}) => element.channel = channel)
			)
			break

		case 'user':
			promises.push(
				slack.users.info({ user: element.user_id }).then(({user}) => element.user = user)
			)
			break

		case 'emoji':
			if(!element.unicode) {
				promises.push(
					getEmoji(element.name).then(url => element.url = url)
				)
			}
			break
	}

	await Promise.all(promises)
}

async function decorateElements(elements) {
	await Promise.all(elements.map(decorateElement))
}

async function decorateBlock(block) {
	if(block.elements) {
		await decorateElements(block.elements)
	}
}

async function decorateBlocks(blocks) {
	await Promise.all(blocks.map(decorateBlock))
}

app.post('/webhook', bodyParser.json(), async (req, res) => {
	console.log({
		event: 'INCOMING_WEBHOOK',
		webhook: req.body
	})
	switch(req.body.type) {
		case `url_verification`: {
			const { challenge } = req.body
			res.send(challenge)
			break
		}

		case `event_callback`: {
			switch(req.body.event.type) {
				case `message`: {
					if(req.body.event.blocks || req.body.event.files) {
						req.body.event.blocks ??= []
						const event = { ...req.body.event }

						const promises = [
							decorateBlocks(req.body.event.blocks),
							slack.users.info({ user: req.body.event.user }).then(({user}) => event.user = user)
						]

						if(req.body.event.parent_user_id) {
							promises.push(
								slack.users.info({ user: req.body.event.parent_user_id }).then(({user}) => event.parent = user)
							)
						}

						await Promise.all(promises)

						sse.send(event)
					}

					res.status(201).send()
					break
				}

				default: {
					console.log(req.body)
					res.status(401).send()
				}
			}

			break
		}

		default: {
			console.log(req.body)
			res.status(201).send()
		}
	}
})

const port = process.env.PORT || 3030

app.listen(port, () => console.log(`listening on http://localhost:${port}`))
