import { h, render } from 'https://cdn.skypack.dev/preact'
import { useState, useEffect } from 'https://cdn.skypack.dev/preact/hooks'
import htm from 'https://cdn.skypack.dev/htm'

const html = htm.bind(h)

const source = new EventSource('/events')

function App () {
	const [messages, setMessages] = useState([])

	useEffect(() => {
		function listen(event) {
			setMessages(messages => [...messages, JSON.parse(event.data)])
		}

		source.addEventListener('message', listen)

		return () => {
			source.removeEventListener('message', listen)
		}
	}, [])

	return html`
		<ul>
			${messages.map(({ user_name, text, timestamp }) => html`
				<li key=${timestamp}><strong>${user_name}</strong> ${text}</li>
			`)}
		</ul>
	`
}

render(html`<${App} />`, document.querySelector('main'))
