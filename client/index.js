import 'https://esm.sh/preact/debug'
import { h, render } from 'https://esm.sh/preact'
import { useState, useEffect, useErrorBoundary, useRef, useLayoutEffect } from 'https://esm.sh/preact/hooks'
import htm from 'https://esm.sh/htm'
import ReconnectingEventSource from 'https://esm.sh/reconnecting-eventsource'

const html = htm.bind(h)

const source = new ReconnectingEventSource('/events')

const Text = ({ url, style = {}, text }) => {
	const wrappers = [
		style.bold && 'b',
		style.italic && 'i',
		style.strike && 's',
		style.code && 'code',
		url && (({ children }) => html`<a href=${url}>${children}</a>`)
	].filter(Boolean)

	if(!text && url) {
		const parsed = new URL(url)
		return html`<a href=${url} class="external-link">${parsed.hostname} ⎋</a>`
	}

	const lines = text.split('\n')
	const interspersed = lines.flatMap(line => [line, html`<br />`]).slice(0, -1)

	return wrappers.reduce(
		(wrapped, wrapper) => html`<${wrapper}>${wrapped}<//>`,
		interspersed
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
	user: ({ user, ...props }) => html`<${User} user=${user} mention />`,
	channel: ({ channel, ...props }) => `#${channel.name}`,
	emoji: ({ unicode, url, name }) => unicode
		? unicode.split('-').map(codepoint => String.fromCodePoint(parseInt(codepoint, 16))).join('')
		: html`<img class="emoji" alt=${name} src=${url} />`
}

const blocks = {
	rich_text: Elements
}

const Block = ({ block }) => (blocks[block.type] || Fallback)(block)
const Blocks = ({ blocks }) => {
	return blocks.map(block => html`<${Block} block=${block} key=${block.id} />`)
}

const User = ({ user, mention = false }) => html`
	<span class="user" style="--color: #${user.color}">
		${mention ? '@' : html`<img src=${user.profile.image_32} alt=${user.real_name} />`}
		${user.real_name}
	</span>
`

const Image = ({ thumb_360, thumb_360_h: height, thumb_360_w: width, title }) => {
	if(!thumb_360) return null

	const aspect =  height / width
	const newWidth = 40 / aspect

	return html`
		<img src=${`/image?url=${encodeURIComponent(thumb_360)}`} alt=${title} class="image" width=${newWidth}  height="40" />`
}

const Images = ({ files }) => html`
	<div class="images">
		${files.map(file => html`<${Image} ...${file} />`)}
	</div>
`

const useTransition = (name) => {
	const [ className, setClassname ] = useState('')
	const ref = useRef(null)

	useLayoutEffect(() => {
		setClassname(`${name}-enter`)

		const frame = requestAnimationFrame(() => {
			setClassname(`${name}-enter ${name}-enter-active`)
		})

		function removeClass() {
			setClassname('')
		}

		if(ref.current) {
			ref.current.addEventListener('transitionend', removeClass, { once: true })
		}

		return () => {
			cancelAnimationFrame(frame)

			if(ref.current) {
				ref.current.removeEventListener('transitionend', removeClass)
			}
		}
	}, [])

	return [className, ref]
}

const Message = ({ user, parent, text, blocks, files }) => {
	const [transitionClass, ref] = useTransition('message')

	return html`
		<span className=${`message ${transitionClass}`} ref=${ref}>
			<${User} user=${user} />${' '}
			${parent ? html`➥<${User} user=${parent} mention />` : null}${' '}
			<${Blocks} blocks=${blocks} />
			${files && html`<${Images} files=${files} />`}
		</span>
	`
}

const MessageList = ({ messages }) => html`
	<ul class="message-list">
		${messages.map(({ ts, ...message }) => html`
			<li key=${ts}><${Message} ...${message} /></li>
		`)}
	</ul>
`

function App () {
	const [ messages, setMessages ] = useState(localStorage.argyle ? JSON.parse([localStorage.argyle]) : [])
	const [ error, resetError ] = useErrorBoundary()

	if(error) {
		console.error(error)
		resetError()
	}

	useEffect(() => {
		function listen(event) {
			try {
				setMessages(messages => {
					const newMessages = [...messages, JSON.parse(event.data)].slice(-20)
					localStorage.argyle = JSON.stringify(newMessages)
					return newMessages
				})
			} catch {}
		}

		source.addEventListener('message', listen)

		return () => {
			source.removeEventListener('message', listen)
		}
	}, [])

	return html`
		<${MessageList} messages=${messages} />
	`
}

render(html`<${App} />`, document.querySelector('main'))
