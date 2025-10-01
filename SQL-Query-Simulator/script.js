"use strict"

// Sample data tables
const employees = [
    { id: 1, name: 'John Doe', department: 'HR', salary: 50000, hire_date: '2020-03-15' },
    { id: 2, name: 'Jane Smith', department: 'Engineering', salary: 75000, hire_date: '2019-07-22' },
    { id: 3, name: 'Robert Johnson', department: 'Sales', salary: 60000, hire_date: '2021-01-10' },
    { id: 4, name: 'Emily Davis', department: 'Engineering', salary: 80000, hire_date: '2018-11-05' },
    { id: 5, name: 'Michael Wilson', department: 'Marketing', salary: 55000, hire_date: '2022-05-30' },
    { id: 6, name: 'Sarah Brown', department: 'Engineering', salary: 90000, hire_date: '2017-09-12' }
];

const orders = [
    { order_id: 101, customer_id: 1, product: 'Laptop', amount: 1200, order_date: '2023-01-15' },
    { order_id: 102, customer_id: 2, product: 'Mouse', amount: 25, order_date: '2023-01-16' },
    { order_id: 103, customer_id: 1, product: 'Keyboard', amount: 75, order_date: '2023-01-20' },
    { order_id: 104, customer_id: 3, product: 'Monitor', amount: 300, order_date: '2023-02-05' },
    { order_id: 105, customer_id: 2, product: 'Laptop', amount: 1200, order_date: '2023-02-10' },
    { order_id: 106, customer_id: 4, product: 'Tablet', amount: 500, order_date: '2023-02-15' }
];

const products = [
    { product_id: 1, name: 'Laptop', category: 'Electronics', price: 1200, stock: 15 },
    { product_id: 2, name: 'Mouse', category: 'Accessories', price: 25, stock: 50 },
    { product_id: 3, name: 'Keyboard', category: 'Accessories', price: 75, stock: 30 },
    { product_id: 4, name: 'Monitor', category: 'Electronics', price: 300, stock: 20 },
    { product_id: 5, name: 'Tablet', category: 'Electronics', price: 500, stock: 10 }
];

// Table mapping
const tables = {
    employees,
    orders,
    products
};

// Main query execution function
function runQuery() {
    const query = document.getElementById('queryInput').value.trim();
    const resultContainer = document.getElementById('resultContainer');

    if (!query) {
        resultContainer.innerHTML = '<div class="error">Please enter a query</div>';
        return;
    }

    try {
        const result = executeSQL(query);
        displayResult(result);
    } catch (error) {
        resultContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// SQL execution engine
function executeSQL(query) {
    // Convert to uppercase for easier parsing
    const upperQuery = query.toUpperCase();

    // Basic SELECT query
    if (upperQuery.startsWith('SELECT')) {
        return executeSelect(query);
    }

    // Set operations
    if (upperQuery.includes('UNION')) {
        return executeUnion(query);
    }

    if (upperQuery.includes('INTERSECT')) {
        return executeIntersect(query);
    }

    if (upperQuery.includes('EXCEPT')) {
        return executeExcept(query);
    }

    throw new Error('Unsupported query type');
}

// SELECT query execution
function executeSelect(query) {
    const upperQuery = query.toUpperCase();

    // Extract table name
    const fromIndex = upperQuery.indexOf('FROM');
    if (fromIndex === -1) {
        throw new Error('FROM clause is required');
    }

    const tableName = extractTableName(query, fromIndex);
    let data = tables[tableName];

    if (!data) {
        throw new Error(`Table '${tableName}' not found`);
    }

    // Apply WHERE clause if present
    const whereIndex = upperQuery.indexOf('WHERE');
    if (whereIndex !== -1) {
        data = applyWhere(data, query, whereIndex);
    }

    // Apply GROUP BY if present
    const groupByIndex = upperQuery.indexOf('GROUP BY');
    if (groupByIndex !== -1) {
        data = applyGroupBy(data, query, groupByIndex);
    }

    // Apply HAVING clause if present (only after GROUP BY)
    const havingIndex = upperQuery.indexOf('HAVING');
    if (havingIndex !== -1 && groupByIndex !== -1) {
        data = applyHaving(data, query, havingIndex);
    }

    // Apply ORDER BY if present
    const orderByIndex = upperQuery.indexOf('ORDER BY');
    if (orderByIndex !== -1) {
        data = applyOrderBy(data, query, orderByIndex);
    }

    // Apply SELECT columns
    const selectEnd = fromIndex;
    const selectClause = query.substring(6, selectEnd).trim();
    data = applySelect(data, selectClause);

    return data;
}

// Extract table name from query
function extractTableName(query, fromIndex) {
    const afterFrom = query.substring(fromIndex + 4).trim();
    const spaceIndex = afterFrom.indexOf(' ');
    const whereIndex = afterFrom.indexOf('WHERE');

    let tableNameEnd = spaceIndex;
    if (whereIndex !== -1 && (spaceIndex === -1 || whereIndex < spaceIndex)) {
        tableNameEnd = whereIndex;
    }

    return afterFrom.substring(0, tableNameEnd !== -1 ? tableNameEnd : afterFrom.length).trim();
}

// Apply WHERE clause
function applyWhere(data, query, whereIndex) {
    const condition = query.substring(whereIndex + 5).trim();
    const conditions = parseCondition(condition);

    return data.filter(row => {
        return evaluateConditions(row, conditions);
    });
}

// Apply GROUP BY clause
function applyGroupBy(data, query, groupByIndex) {
    const afterGroupBy = query.substring(groupByIndex + 8).trim();
    const havingIndex = afterGroupBy.toUpperCase().indexOf('HAVING');
    const orderByIndex = afterGroupBy.toUpperCase().indexOf('ORDER BY');

    let groupByEnd = havingIndex !== -1 ? havingIndex :
        orderByIndex !== -1 ? orderByIndex : afterGroupBy.length;

    const groupByFields = afterGroupBy.substring(0, groupByEnd)
        .split(',')
        .map(field => field.trim());

    // Group the data
    const groups = {};
    data.forEach(row => {
        const key = groupByFields.map(field => row[field]).join('|');
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(row);
    });

    // Apply aggregate functions
    const result = [];
    for (const key in groups) {
        const group = groups[key];
        const aggregatedRow = { ...group[0] };

        // For now, just count the rows in each group
        aggregatedRow.count = group.length;

        result.push(aggregatedRow);
    }

    return result;
}

// Apply HAVING clause
function applyHaving(data, query, havingIndex) {
    const condition = query.substring(havingIndex + 6).trim();
    const conditions = parseCondition(condition);

    return data.filter(row => {
        return evaluateConditions(row, conditions);
    });
}

// Apply ORDER BY clause
function applyOrderBy(data, query, orderByIndex) {
    const afterOrderBy = query.substring(orderByIndex + 8).trim();
    const orderFields = afterOrderBy.split(',')
        .map(field => {
            const parts = field.trim().split(' ');
            return {
                field: parts[0],
                direction: parts.length > 1 && parts[1].toUpperCase() === 'DESC' ? 'desc' : 'asc'
            };
        });

    return [...data].sort((a, b) => {
        for (const { field, direction } of orderFields) {
            if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
            if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
}

// Apply SELECT columns
function applySelect(data, selectClause) {
    if (selectClause === '*') {
        return data;
    }

    const columns = selectClause.split(',')
        .map(col => col.trim());

    return data.map(row => {
        const newRow = {};
        columns.forEach(col => {
            // Handle aggregate functions (simplified)
            if (col.toUpperCase().startsWith('COUNT')) {
                newRow[col] = data.length;
            } else if (col.toUpperCase().startsWith('SUM')) {
                const field = col.substring(4, col.length - 1);
                newRow[col] = data.reduce((sum, r) => sum + (r[field] || 0), 0);
            } else if (col.toUpperCase().startsWith('AVG')) {
                const field = col.substring(4, col.length - 1);
                const sum = data.reduce((s, r) => s + (r[field] || 0), 0);
                newRow[col] = sum / data.length;
            } else {
                newRow[col] = row[col];
            }
        });
        return newRow;
    });
}

// Parse WHERE/HAVING conditions
function parseCondition(condition) {
    // This is a simplified parser - in a real implementation, you'd need a proper parser
    const conditions = [];

    // Split by AND/OR (simplified)
    const andParts = condition.split(' AND ');
    andParts.forEach(part => {
        const orParts = part.split(' OR ');
        orParts.forEach(orPart => {
            // Check for comparison operators
            const operators = ['>=', '<=', '!=', '<>', '=', '>', '<'];
            let operator = null;
            let operatorIndex = -1;

            for (const op of operators) {
                const index = orPart.indexOf(op);
                if (index !== -1) {
                    operator = op;
                    operatorIndex = index;
                    break;
                }
            }

            if (operator) {
                const field = orPart.substring(0, operatorIndex).trim();
                let value = orPart.substring(operatorIndex + operator.length).trim();

                // Remove quotes if present
                if ((value.startsWith("'") && value.endsWith("'")) ||
                    (value.startsWith('"') && value.endsWith('"'))) {
                    value = value.substring(1, value.length - 1);
                }

                // Try to convert to number if possible
                if (!isNaN(value)) {
                    value = parseFloat(value);
                }

                conditions.push({ field, operator, value });
            }
        });
    });

    return conditions;
}

// Evaluate conditions for a row
function evaluateConditions(row, conditions) {
    // Simplified evaluation - assumes AND between all conditions
    for (const { field, operator, value } of conditions) {
        const rowValue = row[field];

        switch (operator) {
            case '=':
                if (rowValue != value) return false;
                break;
            case '!=':
            case '<>':
                if (rowValue == value) return false;
                break;
            case '>':
                if (rowValue <= value) return false;
                break;
            case '<':
                if (rowValue >= value) return false;
                break;
            case '>=':
                if (rowValue < value) return false;
                break;
            case '<=':
                if (rowValue > value) return false;
                break;
        }
    }

    return true;
}

// Set operations
function executeUnion(query) {
    const parts = query.split(/UNION/i);
    const result1 = executeSQL(parts[0].trim());
    const result2 = executeSQL(parts[1].trim());

    // Simple union (no duplicate checking in this implementation)
    return [...result1, ...result2];
}

function executeIntersect(query) {
    const parts = query.split(/INTERSECT/i);
    const result1 = executeSQL(parts[0].trim());
    const result2 = executeSQL(parts[1].trim());

    // Simple intersection based on JSON string comparison
    const result2Strings = result2.map(row => JSON.stringify(row));
    return result1.filter(row => result2Strings.includes(JSON.stringify(row)));
}

function executeExcept(query) {
    const parts = query.split(/EXCEPT/i);
    const result1 = executeSQL(parts[0].trim());
    const result2 = executeSQL(parts[1].trim());

    // Simple except based on JSON string comparison
    const result2Strings = result2.map(row => JSON.stringify(row));
    return result1.filter(row => !result2Strings.includes(JSON.stringify(row)));
}

// Display results in a table
function displayResult(data) {
    const resultContainer = document.getElementById('resultContainer');

    if (!data || data.length === 0) {
        resultContainer.innerHTML = '<p>No results found</p>';
        return;
    }

    const columns = Object.keys(data[0]);

    let html = `<table>
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${col}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            ${columns.map(col => `<td>${row[col]}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;

    resultContainer.innerHTML = html;
}

// Load example query
function loadExample() {
    const examples = [
        "SELECT * FROM employees",
        "SELECT name, department FROM employees WHERE department = 'Engineering'",
        "SELECT * FROM employees ORDER BY salary DESC",
        "SELECT department, COUNT(*) as employee_count FROM employees GROUP BY department",
        "SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department HAVING AVG(salary) > 60000",
        "SELECT * FROM employees WHERE salary > 60000 UNION SELECT * FROM employees WHERE department = 'HR'",
        "SELECT name FROM employees WHERE id IN (SELECT customer_id FROM orders WHERE product = 'Laptop')"
    ];

    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    document.getElementById('queryInput').value = randomExample;
}

// Clear query
function clearQuery() {
    document.getElementById('queryInput').value = '';
    document.getElementById('resultContainer').innerHTML = '';
}

// Initialize with a default query result
window.onload = function () {
    runQuery();
};
