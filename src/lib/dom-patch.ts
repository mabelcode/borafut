/**
 * Safely patches DOM mutation methods to prevent React apps from crashing
 * when third-party extensions (like Google Translate) unexpectedly modify the DOM.
 * Reference: React "NotFoundError: Failed to execute 'removeChild' on 'Node'"
 */

if (typeof window !== 'undefined' && typeof Node === 'function' && Node.prototype) {
    const originalRemoveChild = Node.prototype.removeChild
    Node.prototype.removeChild = function <T extends Node>(child: T): T {
        if (child.parentNode !== this) {
            if (console) {
                console.warn('DOM Patch: Prevented removeChild error (node not a child of this parent).', child, this)
            }
            return child
        }
        return originalRemoveChild.call(this, child) as T
    }

    const originalInsertBefore = Node.prototype.insertBefore
    Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
        if (referenceNode && referenceNode.parentNode !== this) {
            if (console) {
                console.warn('DOM Patch: Prevented insertBefore error (reference node not a child of this parent).', referenceNode, this)
            }
            return newNode
        }
        return originalInsertBefore.call(this, newNode, referenceNode) as T
    }
}
