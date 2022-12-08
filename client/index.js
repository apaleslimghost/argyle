import { h, render } from 'https://cdn.skypack.dev/preact'
import htm from 'https://cdn.skypack.dev/htm'

const html = htm.bind(h)

const App = () => html`
	<h1>it works</h1>
`

render(html`<${App} />`, document.querySelector('main'))
