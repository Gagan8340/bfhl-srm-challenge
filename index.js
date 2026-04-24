const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Request logging for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Identity Configuration
const USER_ID = "Gagan8340";
const EMAIL_ID = "sanagalagagan@gmail.com";
const ROLL_NUMBER = "RA2311026010509";

/**
 * Validates the node format X->Y
 * Returns { parent, child } if valid, null otherwise
 */
function validateAndExtractEdge(rawString) {
    const cleanString = rawString.trim();
    const nodePattern = /^([A-Z])->([A-Z])$/;
    const capture = cleanString.match(nodePattern);
    
    if (!capture) return null;
    
    const [_, sourceNode, targetNode] = capture;
    if (sourceNode === targetNode) return null; // Ignore self-loops
    
    return { from: sourceNode, to: targetNode, original: cleanString };
}

/**
 * Builds the nested tree structure recursively
 */
function generateHierarchyMap(currentNode, networkMap) {
    const structure = {};
    const descendants = networkMap[currentNode] || [];
    
    descendants.sort().forEach(childNode => {
        structure[childNode] = generateHierarchyMap(childNode, networkMap);
    });
    
    return structure;
}

/**
 * Calculates depth of a tree (max root-to-leaf path node count)
 */
function calculateVerticalDepth(activeNode, networkMap) {
    const subNodes = networkMap[activeNode] || [];
    if (subNodes.length === 0) return 1;
    
    let peakDepth = 0;
    subNodes.forEach(child => {
        peakDepth = Math.max(peakDepth, calculateVerticalDepth(child, networkMap));
    });
    
    return 1 + peakDepth;
}

/**
 * Checks for cycles using DFS
 */
function detectGraphCycles(node, networkMap, explored, activeStack) {
    explored.add(node);
    activeStack.add(node);
    
    const links = networkMap[node] || [];
    for (const neighbor of links) {
        if (!explored.has(neighbor)) {
            if (detectGraphCycles(neighbor, networkMap, explored, activeStack)) return true;
        } else if (activeStack.has(neighbor)) {
            return true;
        }
    }
    
    activeStack.delete(node);
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
        const parsedNode = validateAndExtractEdge(entry);
        if (!parsedNode) {
            invalid_entries.push(entry);
            return;
        }

        const uniqueKey = `${parsedNode.from}->${parsedNode.to}`;
        if (seen_edges.has(uniqueKey)) {
            if (!duplicate_edges.includes(uniqueKey)) {
                duplicate_edges.push(uniqueKey);
            }
            return;
        }

        seen_edges.add(uniqueKey);

        if (children_with_parents.has(parsedNode.to)) {
            return;
        }

        children_with_parents.add(parsedNode.to);
        valid_edges.push(parsedNode);
    });

    const networkMap = {};
    const graphNodeCollection = new Set();
    const nodeParentTracker = {};

    valid_edges.forEach(edge => {
        if (!networkMap[edge.from]) networkMap[edge.from] = [];
        networkMap[edge.from].push(edge.to);
        nodeParentTracker[edge.to] = edge.from;
        graphNodeCollection.add(edge.from);
        graphNodeCollection.add(edge.to);
    });

    const dsuParent = {};
    function locateRoot(i) {
        if (!dsuParent[i]) dsuParent[i] = i;
        return dsuParent[i] === i ? i : (dsuParent[i] = locateRoot(dsuParent[i]));
    }
    
    graphNodeCollection.forEach(node => dsuParent[node] = node);
    valid_edges.forEach(edge => {
        const rootA = locateRoot(edge.from);
        const rootB = locateRoot(edge.to);
        if (rootA !== rootB) dsuParent[rootA] = rootB;
    });

    const disconnectedGroups = {};
    graphNodeCollection.forEach(node => {
        const groupKey = locateRoot(node);
        if (!disconnectedGroups[groupKey]) disconnectedGroups[groupKey] = [];
        disconnectedGroups[groupKey].push(node);
    });

    // 4. Process each component
    const hierarchies = [];
    let total_trees = 0;
    let total_cycles = 0;
    let max_depth = -1;
    let largest_tree_root = "";

    Object.values(disconnectedGroups).forEach(groupNodes => {
        const availableRoots = groupNodes.filter(node => !nodeParentTracker[node]).sort();
        
        let selectedRoot;
        let forceCycleMode = false;

        if (availableRoots.length > 0) {
            selectedRoot = availableRoots[0];
        } else {
            selectedRoot = groupNodes.sort()[0];
            forceCycleMode = true;
        }

        const exploredSet = new Set();
        const recursionStack = new Set();
        const containsCycle = forceCycleMode || detectGraphCycles(selectedRoot, networkMap, exploredSet, recursionStack);

        const groupResult = { root: selectedRoot };

        if (containsCycle) {
            groupResult.tree = {};
            groupResult.has_cycle = true;
            total_cycles++;
        } else {
            const nestedTreeStructure = {};
            nestedTreeStructure[selectedRoot] = generateHierarchyMap(selectedRoot, networkMap);
            groupResult.tree = nestedTreeStructure;
            
            const groupDepth = calculateVerticalDepth(selectedRoot, networkMap);
            groupResult.depth = groupDepth;
            total_trees++;

            if (groupDepth > max_depth) {
                max_depth = groupDepth;
                largest_tree_root = selectedRoot;
            } else if (groupDepth === max_depth) {
                if (!largest_tree_root || selectedRoot < largest_tree_root) {
                    largest_tree_root = selectedRoot;
                }
            }
        }

        hierarchies.push(groupResult);
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

app.use(express.static(path.join(__dirname, 'public')));

// Fallback to serve index.html for any GET requests
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
