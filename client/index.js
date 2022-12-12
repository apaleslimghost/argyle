import { h, render } from 'https://cdn.skypack.dev/preact'
import { useState, useEffect } from 'https://cdn.skypack.dev/preact/hooks'
import htm from 'https://cdn.skypack.dev/htm'

const html = htm.bind(h)

const source = new EventSource('/events')

const Text = ({ style = {}, text, url }) => {
	const wrappers = [
		style.bold && 'b',
		style.italic && 'i',
		style.strike && 's',
		url && (({ children }) => html`<a href=${url}>${children}</a>`)
	].filter(Boolean)

	return wrappers.reduce(
		(wrapped, wrapper) => html`<${wrapper}>${wrapped}<//>`,
		text === '\\n' ? html`<br>` : text
	)
}

const Fallback = () => null
const Element = ({ element }) => (elements[element.type] || Fallback)(element)
const Elements = ({ elements }) => elements.map((element, i) => html`<${Element} element=${element} key=${i} />`)

const elements = {
	rich_text_section: Elements,
	rich_text_list: ({ elements, style }) => html`<${style === 'ordered' ? 'ol' : 'ul'}>${Elements({elements}).map(element => html`<li>${element}</li>`)}<//>`,
	text: Text,
	link: Text,
	emoji: ({ unicode }) => String.fromCodePoint(parseInt(unicode, 16))
}

const blocks = {
	rich_text: Elements
}

const Block = ({ block }) => (blocks[block.type] || Fallback)(block)
const Blocks = ({ blocks }) => {
	console.log(blocks)
	return blocks.map(block => html`<${Block} block=${block} key=${block.id} />`)
}

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
			${messages.map(({ user, text, ts, blocks }) => html`
				<li key=${ts}><strong>${user.real_name}</strong> <${Blocks} blocks=${blocks} /></li>
			`)}
		</ul>
	`
}

render(html`<${App} />`, document.querySelector('main'))
