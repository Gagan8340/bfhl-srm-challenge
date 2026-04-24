const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Identity Configuration
const USER_ID = "gagan_1849";
const EMAIL_ID = "gs5318@srmist.edu.in";
const ROLL_NUMBER = "RA2311026010509";

/**
 * Validates the node format X->Y
 * Returns { parent, child } if valid, null otherwise
 */
function parseEdge(edgeStr) {
    const trimmed = edgeStr.trim();
    const regex = /^([A-Z])->([A-Z])$/;
    const match = trimmed.match(regex);

    if (!match) return null;

    const [_, parent, child] = match;
    if (parent === child) return null; // Self-loop treated as invalid

    return { parent, child, original: trimmed };
}

/**
 * Builds the nested tree structure recursively
 */
function buildNestedTree(node, adj) {
    const tree = {};
    const children = adj[node] || [];

    children.sort().forEach(child => {
        tree[child] = buildNestedTree(child, adj);
    });

    return tree;
}

/**
 * Calculates depth of a tree (max root-to-leaf path node count)
 */
function getDepth(node, adj) {
    const children = adj[node] || [];
    if (children.length === 0) return 1;

    let maxChildDepth = 0;
    children.forEach(child => {
        maxChildDepth = Math.max(maxChildDepth, getDepth(child, adj));
    });

    return 1 + maxChildDepth;
}

/**
 * Checks for cycles using DFS
 */
function hasCycleDFS(node, adj, visited, stack) {
    visited.add(node);
    stack.add(node);

    const children = adj[node] || [];
    for (const child of children) {
        if (!visited.has(child)) {
            if (hasCycleDFS(child, adj, visited, stack)) return true;
        } else if (stack.has(child)) {
            return true;
        }
    }

    stack.delete(node);
    return false;
}

app.post('/bfhl', (req, res) => {
    const { data } = req.body;

    if (!Array.isArray(data)) {
        return res.status(400).json({ is_success: false, message: "Invalid input format. 'data' must be an array." });
    }

    const invalid_entries = [];
    const duplicate_edges = [];
    const seen_edges = new Set();
    const valid_edges = [];
    const children_with_parents = new Set();

    // 1. Validation & Multi-parent/Duplicate filtering
    data.forEach(entry => {
        const parsed = parseEdge(entry);
        if (!parsed) {
            invalid_entries.push(entry);
            return;
        }

        const edgeKey = `${parsed.parent}->${parsed.child}`;
        if (seen_edges.has(edgeKey)) {
            if (!duplicate_edges.includes(edgeKey)) {
                duplicate_edges.push(edgeKey);
            }
            return;
        }

        seen_edges.add(edgeKey);

        // Multi-parent rule: first Encounter wins
        if (children_with_parents.has(parsed.child)) {
            // Silently discard subsequent parent edges
            return;
        }

        children_with_parents.add(parsed.child);
        valid_edges.push(parsed);
    });

    // 2. Build adjacency list and find all unique nodes
    const adj = {};
    const allNodes = new Set();
    const childOf = {}; // node -> parent

    valid_edges.forEach(edge => {
        if (!adj[edge.parent]) adj[edge.parent] = [];
        adj[edge.parent].push(edge.child);
        childOf[edge.child] = edge.parent;
        allNodes.add(edge.parent);
        allNodes.add(edge.child);
    });

    // 3. Group into components (disjoint sets)
    const parentMap = {};
    function find(i) {
        if (!parentMap[i]) parentMap[i] = i;
        if (parentMap[i] === i) return i;
        return find(parentMap[i]);
    }
    function union(i, j) {
        const rootI = find(i);
        const rootJ = find(j);
        if (rootI !== rootJ) parentMap[rootI] = rootJ;
    }

    allNodes.forEach(node => parentMap[node] = node);
    valid_edges.forEach(edge => union(edge.parent, edge.child));

    const components = {};
    allNodes.forEach(node => {
        const root = find(node);
        if (!components[root]) components[root] = [];
        components[root].push(node);
    });

    // 4. Process each component
    const hierarchies = [];
    let total_trees = 0;
    let total_cycles = 0;
    let max_depth = -1;
    let largest_tree_root = "";

    Object.values(components).forEach(compNodes => {
        // Find roots in this component
        const roots = compNodes.filter(node => !childOf[node]).sort();

        let root;
        let is_pure_cycle = false;

        if (roots.length > 0) {
            // If multiple roots exist in one component (shouldn't happen with multi-parent rule, 
            // but just in case of disconnected nodes which would be separate components anyway)
            root = roots[0];
        } else {
            // Pure cycle: lexicographically smallest
            root = compNodes.sort()[0];
            is_pure_cycle = true;
        }

        // Cycle detection
        const visited = new Set();
        const stack = new Set();
        const has_cycle = is_pure_cycle || hasCycleDFS(root, adj, visited, stack);

        const hierarchy = { root };

        if (has_cycle) {
            hierarchy.tree = {};
            hierarchy.has_cycle = true;
            total_cycles++;
        } else {
            const tree = {};
            tree[root] = buildNestedTree(root, adj);
            hierarchy.tree = tree;

            const depth = getDepth(root, adj);
            hierarchy.depth = depth;
            total_trees++;

            // Track largest tree
            if (depth > max_depth) {
                max_depth = depth;
                largest_tree_root = root;
            } else if (depth === max_depth) {
                if (!largest_tree_root || root < largest_tree_root) {
                    largest_tree_root = root;
                }
            }
        }

        hierarchies.push(hierarchy);
    });

    // Sort hierarchies by root lexicographically
    hierarchies.sort((a, b) => a.root.localeCompare(b.root));

    res.json({
        user_id: USER_ID,
        email_id: EMAIL_ID,
        college_roll_number: ROLL_NUMBER,
        hierarchies,
        invalid_entries,
        duplicate_edges,
        summary: {
            total_trees,
            total_cycles,
            largest_tree_root: largest_tree_root || null
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
