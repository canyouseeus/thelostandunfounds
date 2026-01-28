
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const fs = await import('fs');
    const path = await import('path');

    const root = process.cwd();

    const listDir = (dir: string) => {
        try {
            return fs.readdirSync(dir);
        } catch (e: any) {
            return [`ERROR: ${e.message}`];
        }
    };

    const traverse = (dir: string, depth = 0): Record<string, any> => {
        if (depth > 3) return { '...': 'max depth' };
        try {
            const files = fs.readdirSync(dir);
            const result: Record<string, any> = {};
            for (const f of files) {
                const fullPath = path.join(dir, f);
                if (fs.statSync(fullPath).isDirectory()) {
                    if (f !== 'node_modules' && f !== '.git') {
                        result[f] = traverse(fullPath, depth + 1);
                    }
                } else {
                    result[f] = 'file';
                }
            }
            return result;
        } catch (e: any) {
            return { error: e.message };
        }
    };

    // Try to load local modules to see if they exist
    let productsHandlerStatus = 'unknown'
    try {
        // @ts-ignore
        await import('../../lib/api-handlers/_products-handler.js')
        productsHandlerStatus = 'loaded'
    } catch (e: any) {
        productsHandlerStatus = `failed: ${e.message}`
    }

    res.status(200).json({
        status: 'ok',
        message: 'File structure debug',
        cwd: root,
        files: traverse(root),
        modules: {
            productsHandler: productsHandlerStatus
        }
    })
}
