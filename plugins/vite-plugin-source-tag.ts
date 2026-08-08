/**
 * Stamps every intrinsic JSX element with `data-tlu-src="src/pages/Foo.tsx:214"`.
 *
 * This is what makes SAGE MODE's selector worth anything: clicking a button on the
 * live site yields the file and line that rendered it, so "this button is too big"
 * arrives at a coding agent already knowing where to look instead of guessing from
 * a class name.
 *
 * Runs as a Babel plugin inside @vitejs/plugin-react, so it costs no new dependency.
 * Only lowercase (host) elements are tagged — adding the attribute to a custom
 * component would pass it down as an unrecognized prop.
 */

import path from 'path'

interface BabelTypes {
    jsxAttribute: (name: any, value: any) => any
    jsxIdentifier: (name: string) => any
    stringLiteral: (value: string) => any
}

export const SOURCE_ATTR = 'data-tlu-src'

export default function sourceTagPlugin({ types: t }: { types: BabelTypes }) {
    return {
        name: 'tlu-source-tag',
        visitor: {
            JSXOpeningElement(nodePath: any, state: any) {
                const name = nodePath.node.name
                // Host elements only: <div>, <button>. Not <Card>, not <Foo.Bar>.
                if (name?.type !== 'JSXIdentifier') return
                if (!/^[a-z]/.test(name.name)) return

                // Never double-stamp — the plugin can see a file more than once.
                const already = nodePath.node.attributes.some(
                    (attr: any) =>
                        attr.type === 'JSXAttribute' && attr.name?.name === SOURCE_ATTR
                )
                if (already) return

                const filename: string | undefined = state.filename
                const line: number | undefined = nodePath.node.loc?.start?.line
                if (!filename || !line) return

                const rel = path.relative(process.cwd(), filename).split(path.sep).join('/')
                // Skip anything outside the repo (node_modules, linked packages).
                if (rel.startsWith('..') || rel.includes('node_modules')) return

                nodePath.node.attributes.push(
                    t.jsxAttribute(
                        t.jsxIdentifier(SOURCE_ATTR),
                        t.stringLiteral(`${rel}:${line}`)
                    )
                )
            },
        },
    }
}
