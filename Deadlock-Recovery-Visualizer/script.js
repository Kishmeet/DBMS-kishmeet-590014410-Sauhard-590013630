document.addEventListener('DOMContentLoaded', function () {
    const graphContent = document.getElementById('graph-content');
    const generateBtn = document.getElementById('generateBtn');
    const detectBtn = document.getElementById('detectBtn');
    const abortBtn = document.getElementById('abortBtn');
    const preemptBtn = document.getElementById('preemptBtn');
    const bankerBtn = document.getElementById('bankerBtn');
    const deadlockStatus = document.getElementById('deadlockStatus');
    const bankerStatus = document.getElementById('bankerStatus');

    let processes = [];
    let resources = [];
    let edges = [];
    let deadlockDetected = false;

    // Initialize the graph
    generateGraph();

    // Event listeners
    generateBtn.addEventListener('click', generateGraph);
    detectBtn.addEventListener('click', detectDeadlock);
    abortBtn.addEventListener('click', abortProcess);
    preemptBtn.addEventListener('click', preemptResource);
    bankerBtn.addEventListener('click', runBankersAlgorithm);

    function generateGraph() {
        // Clear previous graph
        graphContent.innerHTML = '';
        processes = [];
        resources = [];
        edges = [];
        deadlockDetected = false;
        deadlockStatus.textContent = 'No deadlock detected';
        deadlockStatus.className = 'status';

        const processCount = parseInt(document.getElementById('processCount').value);
        const resourceCount = parseInt(document.getElementById('resourceCount').value);

        // Create processes
        for (let i = 0; i < processCount; i++) {
            const process = document.createElement('div');
            process.className = 'process';
            process.style.backgroundColor = '#2196f3';
            process.textContent = `P${i}`;

            // Position processes on the left side
            const top = 50 + (i * 80);
            const left = 50;
            process.style.top = `${top}px`;
            process.style.left = `${left}px`;

            graphContent.appendChild(process);
            processes.push({
                element: process,
                id: i,
                x: left,
                y: top
            });
        }

        // Create resources
        for (let i = 0; i < resourceCount; i++) {
            const resource = document.createElement('div');
            resource.className = 'resource';
            resource.style.backgroundColor = '#9c27b0';
            resource.textContent = `R${i}`;

            // Position resources on the right side
            const top = 50 + (i * 80);
            const left = graphContent.offsetWidth - 100;
            resource.style.top = `${top}px`;
            resource.style.left = `${left}px`;

            graphContent.appendChild(resource);
            resources.push({
                element: resource,
                id: i,
                x: left,
                y: top
            });
        }

        // Create random edges (allocations and requests)
        for (let i = 0; i < processCount; i++) {
            // Each process has at least one allocation and one request
            const allocResource = Math.floor(Math.random() * resourceCount);
            createEdge(processes[i], resources[allocResource], 'allocation');

            const requestResource = Math.floor(Math.random() * resourceCount);
            createEdge(processes[i], resources[requestResource], 'request');

            // Add some additional random edges
            if (Math.random() > 0.5) {
                const extraResource = Math.floor(Math.random() * resourceCount);
                createEdge(processes[i], resources[extraResource],
                    Math.random() > 0.5 ? 'allocation' : 'request');
            }
        }
    }

    function createEdge(source, target, type) {
        const edge = document.createElement('div');
        edge.className = `edge ${type}`;

        // Calculate position and angle
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        edge.style.width = `${length}px`;
        edge.style.top = `${source.y}px`;
        edge.style.left = `${source.x}px`;
        edge.style.transform = `rotate(${angle}deg)`;

        // Add arrowhead for requests
        if (type === 'request') {
            edge.style.borderTop = '3px solid transparent';
            edge.style.borderBottom = '3px solid transparent';
            edge.style.borderLeft = `10px solid #ff9800`;
            edge.style.backgroundColor = 'transparent';
            edge.style.width = `${length - 10}px`;
        }

        graphContent.appendChild(edge);
        edges.push({
            element: edge,
            source: source,
            target: target,
            type: type
        });
    }

    function detectDeadlock() {
        // Simple deadlock detection by looking for cycles in the graph
        // In a real implementation, this would use a proper cycle detection algorithm

        // Reset previous deadlock highlights
        edges.forEach(edge => {
            edge.element.classList.remove('deadlock-cycle');
        });

        processes.forEach(process => {
            process.element.classList.remove('deadlock-cycle');
        });

        resources.forEach(resource => {
            resource.element.classList.remove('deadlock-cycle');
        });

        // Simulate deadlock detection
        // For demonstration, we'll randomly decide if there's a deadlock
        const hasDeadlock = Math.random() > 0.5;

        if (hasDeadlock) {
            deadlockDetected = true;
            deadlockStatus.textContent = 'Deadlock detected!';
            deadlockStatus.className = 'status unsafe';

            // Highlight a random cycle for visualization
            const cycleProcesses = [];
            const cycleResources = [];
            const cycleEdges = [];

            // Select a random process and resource to form a cycle
            const p1 = processes[Math.floor(Math.random() * processes.length)];
            const r1 = resources[Math.floor(Math.random() * resources.length)];
            const p2 = processes[Math.floor(Math.random() * processes.length)];

            cycleProcesses.push(p1, p2);
            cycleResources.push(r1);

            // Find edges that connect these nodes
            edges.forEach(edge => {
                if ((edge.source === p1 && edge.target === r1) ||
                    (edge.source === p2 && edge.target === r1) ||
                    (edge.source === p1 && edge.target === p2)) {
                    cycleEdges.push(edge);
                }
            });

            // If we didn't find enough edges, create some for demonstration
            if (cycleEdges.length < 2) {
                // Create a temporary allocation edge from p1 to r1
                const allocEdge = {
                    source: p1,
                    target: r1,
                    type: 'allocation'
                };
                cycleEdges.push(allocEdge);

                // Create a temporary request edge from p2 to r1
                const requestEdge = {
                    source: p2,
                    target: r1,
                    type: 'request'
                };
                cycleEdges.push(requestEdge);
            }

            // Highlight the cycle
            cycleProcesses.forEach(p => p.element.classList.add('deadlock-cycle'));
            cycleResources.forEach(r => r.element.classList.add('deadlock-cycle'));
            cycleEdges.forEach(e => {
                if (e.element) {
                    e.element.classList.add('deadlock-cycle');
                }
            });
        } else {
            deadlockDetected = false;
            deadlockStatus.textContent = 'No deadlock detected';
            deadlockStatus.className = 'status safe';
        }
    }

    function abortProcess() {
        if (!deadlockDetected) {
            alert('No deadlock detected. Aborting a process is not necessary.');
            return;
        }

        // Select a random process to abort
        const processToAbort = processes[Math.floor(Math.random() * processes.length)];

        // Remove the process and its edges
        processToAbort.element.style.display = 'none';

        edges.forEach(edge => {
            if (edge.source === processToAbort || edge.target === processToAbort) {
                edge.element.style.display = 'none';
            }
        });

        deadlockDetected = false;
        deadlockStatus.textContent = `Process ${processToAbort.element.textContent} aborted. Deadlock resolved.`;
        deadlockStatus.className = 'status safe';

        // Show a message
        setTimeout(() => {
            alert(`Process ${processToAbort.element.textContent} has been aborted to resolve the deadlock.`);
        }, 500);
    }

    function preemptResource() {
        if (!deadlockDetected) {
            alert('No deadlock detected. Resource preemption is not necessary.');
            return;
        }

        // Select a random resource to preempt
        const resourceToPreempt = resources[Math.floor(Math.random() * resources.length)];

        // Find an allocation edge to this resource and remove it
        let allocationEdge = null;
        for (let edge of edges) {
            if (edge.target === resourceToPreempt && edge.type === 'allocation') {
                allocationEdge = edge;
                break;
            }
        }

        if (allocationEdge) {
            allocationEdge.element.style.display = 'none';

            deadlockDetected = false;
            deadlockStatus.textContent = `Resource ${resourceToPreempt.element.textContent} preempted. Deadlock resolved.`;
            deadlockStatus.className = 'status safe';

            // Show a message
            setTimeout(() => {
                alert(`Resource ${resourceToPreempt.element.textContent} has been preempted from process ${allocationEdge.source.element.textContent} to resolve the deadlock.`);
            }, 500);
        } else {
            alert('No allocation found for preemption. Try a different recovery method.');
        }
    }

    function runBankersAlgorithm() {
        // This is a simplified version of Banker's Algorithm for demonstration
        // In a real implementation, this would use the actual matrices

        // Simulate algorithm execution
        const isSafe = Math.random() > 0.3;

        if (isSafe) {
            bankerStatus.textContent = 'System is in a SAFE state';
            bankerStatus.className = 'status safe';
        } else {
            bankerStatus.textContent = 'System is in an UNSAFE state (potential deadlock)';
            bankerStatus.className = 'status unsafe';
        }

        // Animate the table rows to show the algorithm steps
        const allocationRows = document.querySelectorAll('#allocationMatrix tbody tr');
        const maxRows = document.querySelectorAll('#maxMatrix tbody tr');

        allocationRows.forEach((row, index) => {
            setTimeout(() => {
                row.style.backgroundColor = '#e8f5e9';
                maxRows[index].style.backgroundColor = '#e8f5e9';

                setTimeout(() => {
                    row.style.backgroundColor = '';
                    maxRows[index].style.backgroundColor = '';
                }, 1000);
            }, index * 800);
        });
    }
});
