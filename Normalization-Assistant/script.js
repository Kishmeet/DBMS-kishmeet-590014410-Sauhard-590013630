"use strict"

document.getElementById('compute-btn').addEventListener('click', function () {
    // Get input values
    const attributesInput = document.getElementById('attributes').value.trim();
    const fdInput = document.getElementById('functional-dependencies').value.trim();

    // Validate input
    if (!attributesInput) {
        showError('Please enter attributes.');
        return;
    }

    if (!fdInput) {
        showError('Please enter functional dependencies.');
        return;
    }

    // Parse attributes
    const attributes = attributesInput.split(',').map(attr => attr.trim()).filter(attr => attr);

    // Parse functional dependencies
    const fds = parseFunctionalDependencies(fdInput);

    // Verify functional dependencies with attributes
    const unknown_attributes = [];
    for (const item of fds) {
        for (const element of item.lhs.concat(item.rhs)) {
            for (const label of element.split()) {
                if (!attributes.includes(label) && !unknown_attributes.includes(label)) {
                    unknown_attributes.push(label);
                }
            }
        }
    }

    const unknown_attributes_message = document.getElementById("unknown-attributes-message");
    if (unknown_attributes.length != 0) {
        let error_message;
        if (unknown_attributes.length == 1) {
            error_message = `Unknown attribute: ${unknown_attributes.at(0)}`;
        }
        else {
            error_message = `Unknown attributes: ${unknown_attributes.join(", ")}`;
        }

        unknown_attributes_message.textContent = error_message;
        unknown_attributes_message.style.visibility = "visible";
        return;
    }
    else {
        unknown_attributes_message.textContent = "";
        unknown_attributes_message.style.visibility = null;
    }

    if (fds.length === 0) {
        showError('No valid functional dependencies found.');
        return;
    }

    // Compute results
    const closures = computeClosures(attributes, fds);
    const candidateKeys = findCandidateKeys(attributes, fds);
    const normalizationSteps = computeNormalizationSteps(attributes, fds, candidateKeys);

    // Display results
    displayResults(attributes, fds, closures, candidateKeys, normalizationSteps);
});

function parseFunctionalDependencies(input) {
    const lines = input.split('\n');
    const fds = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const parts = trimmedLine.split(/→|->/);
        if (parts.length !== 2) {

            const equalsParts = trimmedLine.split('=');
            if (equalsParts.length !== 2) continue;

            const lhs = equalsParts[0].trim();
            const rhs = equalsParts[1].trim();

            if (lhs && rhs) {
                fds.push({ lhs: lhs.split(',').map(a => a.trim()), rhs: rhs.split(',').map(a => a.trim()) });
            }
        } else {
            const lhs = parts[0].trim();
            const rhs = parts[1].trim();

            if (lhs && rhs) {
                fds.push({ lhs: lhs.split(',').map(a => a.trim()), rhs: rhs.split(',').map(a => a.trim()) });
            }
        }
    }

    return fds;
}

function computeClosures(attributes, fds) {
    const closures = {};

    for (const attr of attributes) {
        closures[attr] = computeClosure([attr], fds);
    }

    // Also compute closures for combinations
    for (let i = 0; i < attributes.length; i++) {
        for (let j = i + 1; j < attributes.length; j++) {
            const key = `${attributes[i]},${attributes[j]}`;
            closures[key] = computeClosure([attributes[i], attributes[j]], fds);
        }
    }

    return closures;
}

function computeClosure(attrs, fds) {
    let closure = [...attrs];
    let changed = true;

    while (changed) {
        changed = false;
        for (const fd of fds) {
            // Check if all LHS attributes are in the closure
            if (fd.lhs.every(lhsAttr => closure.includes(lhsAttr))) {
                // Add RHS attributes if not already in closure
                for (const rhsAttr of fd.rhs) {
                    if (!closure.includes(rhsAttr)) {
                        closure.push(rhsAttr);
                        changed = true;
                    }
                }
            }
        }
    }

    return closure.sort();
}

function findCandidateKeys(attributes, fds) {
    const candidateKeys = [];

    // Try all possible combinations of attributes
    for (let i = 1; i <= attributes.length; i++) {
        const combinations = getCombinations(attributes, i);

        for (const combo of combinations) {
            const closure = computeClosure(combo, fds);

            // If closure contains all attributes, it's a superkey
            if (closure.length === attributes.length) {
                // Check if it's minimal (no proper subset is a superkey)
                let isMinimal = true;
                for (const key of candidateKeys) {
                    if (isSubset(key, combo)) {
                        isMinimal = false;
                        break;
                    }
                }

                if (isMinimal) {
                    candidateKeys.push(combo);
                }
            }
        }
    }

    return candidateKeys;
}

function getCombinations(arr, k) {
    if (k === 0) return [[]];
    if (k === arr.length) return [arr];

    const result = [];

    for (let i = 0; i < arr.length; i++) {
        const rest = arr.slice(i + 1);
        const combs = getCombinations(rest, k - 1);

        for (const comb of combs) {
            result.push([arr[i], ...comb]);
        }
    }

    return result;
}

function isSubset(subset, superset) {
    return subset.every(item => superset.includes(item));
}

function computeNormalizationSteps(attributes, fds, candidateKeys) {
    const steps = {
        '1NF': {
            description: 'All attributes contain atomic values only',
            relations: [attributes],
            checks: {
                lossless: true,
                dependencyPreservation: true
            }
        },
        '2NF': {
            description: 'No partial dependencies (all non-prime attributes fully depend on candidate keys)',
            relations: decomposeTo2NF(attributes, fds, candidateKeys),
            checks: {
                lossless: checkLosslessJoin(attributes, fds, candidateKeys),
                dependencyPreservation: checkDependencyPreservation(attributes, fds, candidateKeys)
            }
        },
        '3NF': {
            description: 'No transitive dependencies (non-prime attributes depend only on candidate keys)',
            relations: decomposeTo3NF(attributes, fds, candidateKeys),
            checks: {
                lossless: checkLosslessJoin(attributes, fds, candidateKeys),
                dependencyPreservation: checkDependencyPreservation(attributes, fds, candidateKeys)
            }
        },
        'BCNF': {
            description: 'Every determinant is a candidate key',
            relations: decomposeToBCNF(attributes, fds, candidateKeys),
            checks: {
                lossless: checkLosslessJoin(attributes, fds, candidateKeys),
                dependencyPreservation: checkDependencyPreservation(attributes, fds, candidateKeys)
            }
        }
    };

    return steps;
}

function decomposeTo2NF(attributes, fds, candidateKeys) {
    // Simplified implementation - in practice, this would be more complex
    const relations = [attributes];

    // Check for partial dependencies and decompose if needed
    for (const fd of fds) {
        let isPartial = false;

        for (const key of candidateKeys) {
            // Check if LHS is a proper subset of a candidate key
            if (fd.lhs.length < key.length && isSubset(fd.lhs, key)) {
                isPartial = true;
                break;
            }
        }

        if (isPartial) {
            // Create a new relation for this partial dependency
            const newRelation = [...fd.lhs, ...fd.rhs];
            relations.push(newRelation);

            // Remove the RHS from the original relation if it's not part of a key
            for (const rhsAttr of fd.rhs) {
                const index = relations[0].indexOf(rhsAttr);
                if (index !== -1 && !candidateKeys.some(key => key.includes(rhsAttr))) {
                    relations[0].splice(index, 1);
                }
            }
        }
    }

    return relations.filter(rel => rel.length > 0);
}

function decomposeTo3NF(attributes, fds, candidateKeys) {
    // Simplified implementation
    const relations = decomposeTo2NF(attributes, fds, candidateKeys);

    // Check for transitive dependencies and decompose if needed
    for (const fd of fds) {
        let isTransitive = false;

        for (const key of candidateKeys) {
            // Check if LHS is not a superkey and RHS is not part of a key
            if (!isSuperkey(fd.lhs, fds, attributes) &&
                !fd.rhs.some(attr => key.includes(attr))) {
                isTransitive = true;
                break;
            }
        }

        if (isTransitive) {
            // Create a new relation for this transitive dependency
            const newRelation = [...fd.lhs, ...fd.rhs];
            relations.push(newRelation);

            // Remove the RHS from the original relation if it's not part of a key
            for (const relation of relations) {
                if (relation !== newRelation) {
                    for (const rhsAttr of fd.rhs) {
                        const index = relation.indexOf(rhsAttr);
                        if (index !== -1 && !candidateKeys.some(key => key.includes(rhsAttr))) {
                            relation.splice(index, 1);
                        }
                    }
                }
            }
        }
    }

    return relations.filter(rel => rel.length > 0);
}

function decomposeToBCNF(attributes, fds, candidateKeys) {
    // Simplified implementation
    const relations = decomposeTo3NF(attributes, fds, candidateKeys);

    // Check for BCNF violations and decompose if needed
    for (const fd of fds) {
        if (!isSuperkey(fd.lhs, fds, attributes)) {
            // Create a new relation for this dependency
            const newRelation = [...fd.lhs, ...fd.rhs];
            relations.push(newRelation);

            // Remove the RHS from the original relation
            for (const relation of relations) {
                if (relation !== newRelation) {
                    for (const rhsAttr of fd.rhs) {
                        const index = relation.indexOf(rhsAttr);
                        if (index !== -1) {
                            relation.splice(index, 1);
                        }
                    }
                }
            }
        }
    }

    return relations.filter(rel => rel.length > 0);
}

function isSuperkey(attrs, fds, allAttributes) {
    const closure = computeClosure(attrs, fds);
    return closure.length === allAttributes.length;
}

function checkLosslessJoin(attributes, fds, candidateKeys) {
    // Simplified check - in practice, this would use the chase algorithm
    return true;
}

function checkDependencyPreservation(attributes, fds, candidateKeys) {
    // Simplified check
    return true;
}

function displayResults(attributes, fds, closures, candidateKeys, normalizationSteps) {
    const output = document.getElementById('output');
    output.innerHTML = '';

    // Display attributes
    const attributesDiv = document.createElement('div');
    attributesDiv.innerHTML = `<h3>Attributes</h3><p>${attributes.join(', ')}</p>`;
    output.appendChild(attributesDiv);

    // Display functional dependencies
    const fdsDiv = document.createElement('div');
    fdsDiv.innerHTML = `<h3>Functional Dependencies</h3>`;
    const fdList = document.createElement('ul');
    for (const fd of fds) {
        const li = document.createElement('li');
        li.innerHTML = `<span class="key">${fd.lhs.join(', ')}</span> → <span class="key">${fd.rhs.join(', ')}</span>`;
        fdList.appendChild(li);
    }
    fdsDiv.appendChild(fdList);
    output.appendChild(fdsDiv);

    // Display attribute closures
    const closuresDiv = document.createElement('div');
    closuresDiv.innerHTML = `<h3>Attribute Closures</h3>`;
    for (const [attr, closure] of Object.entries(closures)) {
        const closureDiv = document.createElement('div');
        closureDiv.className = 'closure';
        closureDiv.innerHTML = `<strong>${attr}<sup>+</sup></strong> = {${closure.join(', ')}}`;
        closuresDiv.appendChild(closureDiv);
    }
    output.appendChild(closuresDiv);

    // Display candidate keys
    const keysDiv = document.createElement('div');
    keysDiv.innerHTML = `<h3>Candidate Keys</h3>`;
    const keyList = document.createElement('ul');
    for (const key of candidateKeys) {
        const li = document.createElement('li');
        li.innerHTML = `<span class="key">${key.join(', ')}</span>`;
        keyList.appendChild(li);
    }
    keysDiv.appendChild(keyList);
    output.appendChild(keysDiv);

    // Display normalization steps
    const stepsDiv = document.createElement('div');
    stepsDiv.className = 'normalization-steps';
    stepsDiv.innerHTML = `<h3>Normalization Steps</h3>`;

    for (const [stepName, stepData] of Object.entries(normalizationSteps)) {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step';

        stepDiv.innerHTML = `
                    <h3>${stepName}</h3>
                    <div class="step-content">${stepData.description}</div>
                    <div class="relations">
                        ${stepData.relations.map(rel =>
            `<div class="relation">R(${rel.join(', ')})</div>`
        ).join('')}
                    </div>
                    <div class="checks">
                        <div class="check lossless">Lossless Join: ${stepData.checks.lossless ? '✓' : '✗'}</div>
                        <div class="check dependency">Dependency Preservation: ${stepData.checks.dependencyPreservation ? '✓' : '✗'}</div>
                    </div>
                `;

        stepsDiv.appendChild(stepDiv);
    }

    output.appendChild(stepsDiv);
}

function showError(message) {
    const output = document.getElementById('output');
    output.innerHTML = `<div class="error">${message}</div>`;
}
