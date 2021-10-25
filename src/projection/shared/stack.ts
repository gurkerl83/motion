import { addUniqueItem, removeItem } from "../../utils/array"
import { IProjectionNode } from "../node/types"

export class NodeStack {
    lead?: IProjectionNode
    prevLead?: IProjectionNode
    members: IProjectionNode[] = []

    add(node: IProjectionNode) {
        addUniqueItem(this.members, node)
        node.scheduleRender()
    }

    remove(node: IProjectionNode) {
        removeItem(this.members, node)
        if (node === this.prevLead) {
            this.prevLead = undefined
        }
        if (node === this.lead) {
            const prevLead = this.members[this.members.length - 1]
            if (prevLead) {
                this.promote(prevLead)
            }
        }
    }

    relegate(node: IProjectionNode): boolean {
        const indexOfNode = this.members.findIndex((member) => node === member)
        if (indexOfNode === 0) return false

        /**
         * Find the next projection node that is present
         */
        let prevLead: IProjectionNode | undefined
        for (let i = indexOfNode; i >= 0; i--) {
            const member = this.members[i]
            if (member.isPresent !== false) {
                prevLead = member
                break
            }
        }

        if (prevLead) {
            this.promote(prevLead)
            return true
        } else {
            return false
        }
    }

    promote(node: IProjectionNode, preserveFollowOpacity?: boolean) {
        const prevLead = this.lead

        if (node === prevLead) return

        this.prevLead = prevLead
        this.lead = node

        node.show()

        if (prevLead) {
            prevLead.instance && prevLead.scheduleRender()
            node.scheduleRender()
            node.resumeFrom = prevLead

            if (preserveFollowOpacity) {
                node.resumeFrom.preserveOpacity = true
            }

            if (prevLead.snapshot) {
                node.snapshot = prevLead.snapshot
                node.snapshot.latestValues =
                    prevLead.animationValues || prevLead.latestValues
                node.snapshot.isShared = true
            }

            if (node.root?.isUpdating) {
                node.isLayoutDirty = true
            }

            const { crossfade } = node.options
            if (crossfade === false) {
                prevLead.hide()
            } else {
            }
            /**
             * TODO:
             *   - Test border radius when previous node was deleted
             *   - boxShadow mixing
             *   - Shared between element A in scrolled container and element B (scroll stays the same or changes)
             *   - Shared between element A in transformed container and element B (transform stays the same or changes)
             *   - Shared between element A in scrolled page and element B (scroll stays the same or changes)
             * ---
             *   - Crossfade opacity of root nodes
             *   - layoutId changes after animation
             *   - layoutId changes mid animation
             */
        }
    }

    exitAnimationComplete() {
        this.members.forEach((node) => {
            node.options.onExitComplete?.()
            console.log(node.resumingFrom)
            node.resumingFrom?.options.onExitComplete?.()
        })
    }

    scheduleRender() {
        this.members.forEach((node) => {
            node.instance && node.scheduleRender(false)
        })
    }

    /**
     * Clear any leads that have been removed this render to prevent them from being
     * used in future animations and to prevent memory leaks
     */
    removeLeadSnapshot() {
        if (this.lead && this.lead.snapshot) {
            this.lead.snapshot = undefined
        }
    }
}
