import 'https://cdn.skypack.dev/preact/debug'
import { h, render } from 'https://cdn.skypack.dev/preact'
import { useState, useEffect, useErrorBoundary } from 'https://cdn.skypack.dev/preact/hooks'
import htm from 'https://cdn.skypack.dev/htm'

const html = htm.bind(h)

const source = new EventSource('/events')

const Text = ({ style = {}, text, url }) => {
	const wrappers = [
		style.bold && 'b',
		style.italic && 'i',
		style.strike && 's',
		style.code && 'code',
		url && (({ children }) => html`<a href=${url}>${children}</a>`)
	].filter(Boolean)

	return wrappers.reduce(
		(wrapped, wrapper) => html`<${wrapper}>${wrapped}<//>`,
		text === '\\n' ? html`<br>` : text
	)
}

const Fallback = props => {
	console.warn('using fallback', props)
	return null
}
const Element = ({ element }) => (elements[element.type] || Fallback)(element)
const Elements = ({ elements }) => elements.map((element, i) => html`<${Element} element=${element} key=${i} />`)

const elements = {
	rich_text_section: Elements,
	rich_text_list: ({ elements, style }) => html`<${style === 'ordered' ? 'ol' : 'ul'}>${Elements({elements}).map(element => html`<li>${element}</li>`)}<//>`,
	rich_text_preformatted: ({ elements }) => html`<code><pre><${Elements} elements=${elements} /></pre></code>`,
	text: Text,
	link: Text,
	user: ({ user, ...props }) => `@${user.name}`,
	channel: ({ channel, ...props }) => `#${channel.name}`,
	emoji: ({ unicode }) => String.fromCodePoint(parseInt(unicode, 16))
}

const blocks = {
	rich_text: Elements
}

const Block = ({ block }) => (blocks[block.type] || Fallback)(block)
const Blocks = ({ blocks }) => {
	return blocks.map(block => html`<${Block} block=${block} key=${block.id} />`)
}

const User = ({ user }) => html`
	<span class="user" style="--color: #${user.color}">
		<img src=${user.profile.image_32} alt=${user.real_name} />
		<!-- ${console.log(user)} -->
		${user.real_name}
	</span>
`

const Message = ({ user, parent, text, blocks }) => html`
	<${User} user=${user}/> ${parent ? html`<${User} user=${parent}/>` : null} <${Blocks} blocks=${blocks} />
`

function App () {
	const [ messages, setMessages ] = useState([])
	const [ error, resetError ] = useErrorBoundary()

	if(error) {
		console.error(error)
		resetError()
	}

	useEffect(() => {
		function listen(event) {
			try {
				setMessages(messages => [...messages, JSON.parse(event.data)])
			} catch {}
		}

		source.addEventListener('message', listen)

		return () => {
			source.removeEventListener('message', listen)
		}
	}, [])

	return html`
		<ul>
			${messages.map(({ ts, ...message }) => html`
				<li key=${ts}><${Message} ...${message} /></li>
			`)}
		</ul>
	`
}

render(html`<${App} />`, document.querySelector('main'))
