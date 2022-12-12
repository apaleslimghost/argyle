import { h, render } from 'https://cdn.skypack.dev/preact'
import { useState, useEffect } from 'https://cdn.skypack.dev/preact/hooks'
import htm from 'https://cdn.skypack.dev/htm'

const html = htm.bind(h)

const source = new EventSource('/events')

function App () {
	const [messages, setMessages] = useState([])

	useEffect(() => {
		function listen(event) {
			setMessages(messages => [...messages, JSON.parse(event.data)].slice(-5))
		}

		source.addEventListener('message', listen)

		return () => {
			source.removeEventListener('message', listen)
		}
	}, [])

	return html`
		<ul>
			${messages.map(date => html`
				<li>${date}</li>
			`)}
		</ul>
	`
}

render(html`<${App} />`, document.querySelector('main'))
