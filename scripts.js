// Declare some variables
const selectStartYear = 1965; // The earliest year available in the dropdown
const dataStartYear = 1950; // What year to start looking for data in the JSON files
const noData = 'No Data';

// Get the current year
const currentYear = new Date().getFullYear();

// Get the select elements
const yearASelect = document.getElementById('yearA');
const yearBSelect = document.getElementById('yearB');

// Get the theme toggle button
const themeToggleButton = document.getElementById('theme-toggle');

// Function to populate a select element with years
function populateYearOptions(selectElement, defaultYear) {
    for (let year = selectStartYear; year <= currentYear; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === defaultYear) {
            option.selected = true; // Set the default option
        }
        selectElement.appendChild(option);
    }
}

// Find the closest year with data in a specific dataset
function findClosestYear(data, year, keys) {
    // If keys is a string, convert it to an array with one element
    const keysArray = typeof keys === 'string' ? [keys] : keys;

    let closestYearData = null;
    for (let i = year; i >= dataStartYear; i--) {
        closestYearData = data.find(entry => entry.year === i);
        if (closestYearData) break;
    }

    if (!closestYearData) return null;

    // If requesting a single key, return just that value
    if (typeof keys === 'string') {
        return closestYearData[keys];
    }

    // Otherwise, return an object with all requested keys
    const result = {};
    keysArray.forEach(key => {
        result[key] = closestYearData[key];
    });
    return result;
}

// Function to format numbers with commas and optional decimals
function formatNumber(value, showDecimals = true) {
    const options = {
        minimumFractionDigits: showDecimals ? 2 : 0,
        maximumFractionDigits: showDecimals ? 2 : 0
    };
    return value.toLocaleString('en-US', options);
}

// Update the table with data for the selected year
function updateYearData(data, year, columnIds) {
    for (const [file, fileConfig] of Object.entries(columnIds)) {
        const dataset = data[file];
        if (!dataset) continue;

        if (typeof fileConfig.key === 'string') {
            // Single key handling (existing behavior)
            const value = findClosestYear(dataset, year, fileConfig.key);
            const column = document.getElementById(fileConfig.id);
            if (column && value !== null) {
                if (fileConfig.format === 'cents')
                    column.textContent = "$" + formatNumber(value, true);
                else if (fileConfig.format === 'dollars')
                    column.textContent = "$" + formatNumber(value, false);
                else
                    column.textContent = formatNumber(value, false);
            } else if (column) {
                column.textContent = noData;
            }
        } else if (Array.isArray(fileConfig.keys)) {
            // Multiple keys handling
            const values = findClosestYear(dataset, year, fileConfig.keys);

            // First handle the case when no data was found at all
            if (!values) {
                fileConfig.keys.forEach(key => {
                    const columnId = fileConfig.ids[key];
                    const column = document.getElementById(columnId);
                    if (column) {
                        column.textContent = noData;
                    }
                });
                continue;
            }

            // Handle individual keys within the found data
            fileConfig.keys.forEach(key => {
                const columnId = fileConfig.ids[key];
                const column = document.getElementById(columnId);
                if (column && values[key] !== null && values[key] !== undefined) {
                    if (fileConfig.format === 'cents')
                        column.textContent = "$" + formatNumber(values[key], true);
                    else if (fileConfig.format === 'dollars')
                        column.textContent = "$" + formatNumber(values[key], false);
                    else
                        column.textContent = formatNumber(values[key], false);
                } else if (column) {
                    column.textContent = noData;
                }
            });
        }
    }
}

function updateCalculatedValues(data, year, isYearA) {
    // Income sources
    const minWageData = data['minimumWage.json'];
    const medianIncomeData = data['medianPersonalIncome.json'];
    const avgSalaryData = data['averageSalary.json'];

    // Expense sources
    const homeData = data['averageHomePrice.json'];
    const tuitionData = data['averageTuitionPrice.json'];

    if (!minWageData || !medianIncomeData || !avgSalaryData || !homeData || !tuitionData) return;

    // Get values from data
    const minWage = findClosestYear(minWageData, year, 'min_wage');
    const medianIncome = findClosestYear(medianIncomeData, year, 'median_personal_income');
    const avgSalary = findClosestYear(avgSalaryData, year, 'avg_salary');
    const homePrice = findClosestYear(homeData, year, 'avg_home_price');

    // Get tuition values separately
    const publicTuition = findClosestYear(tuitionData, year, 'public_4yr');
    const privateTuition = findClosestYear(tuitionData, year, 'private_nonprofit_4yr');

    // Define all the calculations we need to perform
    const calculations = [
        // Minimum wage calculations
        {
            income: minWage,
            expenses: [
                {expense: homePrice, elementId: 'MinWageHoursForAverageHome'},
                {expense: publicTuition, elementId: 'MinWageHoursForPublicTuition'},
                {expense: privateTuition, elementId: 'MinWageHoursForPrivateTuition'}
            ]
        },
        // Median income calculations
        {
            income: medianIncome !== null ? medianIncome / 2080 : null,
            expenses: [
                {expense: homePrice, elementId: 'MedianIncomeHoursForAverageHome'},
                {expense: publicTuition, elementId: 'MedianIncomeHoursForPublicTuition'},
                {expense: privateTuition, elementId: 'MedianIncomeHoursForPrivateTuition'}
            ]
        },
        // Average salary calculations
        {
            income: avgSalary !== null ? avgSalary / 2080 : null,
            expenses: [
                {expense: homePrice, elementId: 'AverageSalaryHoursForAverageHome'},
                {expense: publicTuition, elementId: 'AverageSalaryHoursForPublicTuition'},
                {expense: privateTuition, elementId: 'AverageSalaryHoursForPrivateTuition'}
            ]
        }
    ];

    // Perform all calculations
    for (const calc of calculations) {
        for (const item of calc.expenses) {
            const cellId = `year${isYearA ? 'A' : 'B'}${item.elementId}`;
            const cell = document.getElementById(cellId);

            if (cell) {
                if (calc.income === null || item.expense === null ||
                    isNaN(calc.income) || isNaN(item.expense)) {
                    cell.textContent = noData;
                } else {
                    const hoursNeeded = Math.round(item.expense / calc.income);
                    cell.textContent = isNaN(hoursNeeded) ? noData : formatNumber(hoursNeeded, false);
                }
            }
        }
    }
}

function updateComparisons() {
    // Direct value comparisons (without color coding)
    const directValueIds = [
        'MinWage',
        'MedianIncome',
        'AverageSalary',
        'AverageHomePrice',
        'PublicTuition',
        'PrivateTuition'
    ];

    // Process direct value comparisons
    for (const id of directValueIds) {
        const yearAElement = document.getElementById(`yearA${id}`);
        const yearBElement = document.getElementById(`yearB${id}`);
        const compareElement = document.getElementById(`compare${id}`);

        if (yearAElement && yearBElement && compareElement) {
            // Check for noData values first
            if (yearAElement.textContent.trim() === noData || yearBElement.textContent.trim() === noData) {
                compareElement.textContent = noData;
                continue;
            }

            // Extract numeric values, removing "$" and commas
            const yearAValue = parseFloat(yearAElement.textContent.replace(/[$,]/g, ''));
            const yearBValue = parseFloat(yearBElement.textContent.replace(/[$,]/g, ''));

            if (!isNaN(yearAValue) && !isNaN(yearBValue) && yearAValue !== 0) {
                // Calculate absolute and percentage differences
                const absoluteDiff = yearBValue - yearAValue;
                const percentDiff = (absoluteDiff / yearAValue) * 100;

                // Format the output with dollar sign for monetary values
                const sign = absoluteDiff >= 0 ? '+' : '';
                const format = id === 'MinWage'; // Show cents for min wage
                compareElement.textContent = `${sign}$${formatNumber(absoluteDiff, format)} (${sign}${percentDiff.toFixed(1)}%)`;
            } else {
                compareElement.textContent = noData;
            }
        }
    }

    // Calculated values comparisons (with color coding)
    const calculatedValueIds = [
        'MinWageHoursForAverageHome',
        'MedianIncomeHoursForAverageHome',
        'AverageSalaryHoursForAverageHome',
        'MinWageHoursForPublicTuition',
        'MedianIncomeHoursForPublicTuition',
        'AverageSalaryHoursForPublicTuition',
        'MinWageHoursForPrivateTuition',
        'MedianIncomeHoursForPrivateTuition',
        'AverageSalaryHoursForPrivateTuition'
    ];

    // Process calculated value comparisons with color coding
    for (const id of calculatedValueIds) {
        const yearAElement = document.getElementById(`yearA${id}`);
        const yearBElement = document.getElementById(`yearB${id}`);
        const compareElement = document.getElementById(`compare${id}`);

        if (yearAElement && yearBElement && compareElement) {
            // Check for noData values first
            if (yearAElement.textContent.trim() === noData || yearBElement.textContent.trim() === noData) {
                compareElement.textContent = noData;
                compareElement.classList.remove('increase', 'decrease');
                continue;
            }

            // Get values as numbers, removing any formatting
            const yearAValue = parseFloat(yearAElement.textContent.replace(/,/g, ''));
            const yearBValue = parseFloat(yearBElement.textContent.replace(/,/g, ''));

            if (!isNaN(yearAValue) && !isNaN(yearBValue) && yearAValue !== 0) {
                // Calculate absolute and percentage differences
                const absoluteDiff = yearBValue - yearAValue;
                const percentDiff = (absoluteDiff / yearAValue) * 100;

                // Format the output
                const sign = absoluteDiff >= 0 ? '+' : '';
                compareElement.textContent = `${sign}${formatNumber(absoluteDiff, false)} (${sign}${percentDiff.toFixed(1)}%)`;

                // Add color coding based on the difference
                if (absoluteDiff < 0) {
                    compareElement.classList.add('decrease');
                    compareElement.classList.remove('increase');
                } else if (absoluteDiff > 0) {
                    compareElement.classList.add('increase');
                    compareElement.classList.remove('decrease');
                } else {
                    compareElement.classList.remove('increase', 'decrease');
                }
            } else {
                compareElement.textContent = noData;
                compareElement.classList.remove('increase', 'decrease');
            }
        }
    }
}

// Apply the theme based on local storage or system preference
function applyTheme(isDarkMode) {
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        themeToggleButton.textContent = 'Switch to Light Mode';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggleButton.textContent = 'Switch to Dark Mode';
    }
}

// Save the theme to local storage
function saveTheme(isDarkMode) {
    if (isDarkMode) {
        localStorage.setItem('work-value-theme', 'dark-mode');
        console.log('Theme saved as dark mode');
    } else {
        localStorage.setItem('work-value-theme', 'light-mode');
        console.log('Theme saved as light mode');
    }
}

// Load the theme from local storage
function loadThemeIsDarkMode() {
    const savedTheme = localStorage.getItem('work-value-theme');
    if (savedTheme === 'dark-mode') {
        console.log('Loaded saved theme: dark mode');
        return true;
    } else if (savedTheme === 'light-mode') {
        console.log('Loaded saved theme: light mode');
        return false;
    } else {
        console.log('No saved theme found, using system preference');
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
}

// Load all JSON files from the /data folder
async function loadAllJsonData() {
    const files = ['minimumWage.json', 'medianPersonalIncome.json', 'averageSalary.json',
        'averageHomePrice.json', 'averageTuitionPrice.json'];
    const data = {};

    for (const file of files) {
        try {
            const response = await fetch(`./data/${file}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${file}: ${response.statusText}`);
            }
            data[file] = await response.json(); // Store data by file name
        } catch (error) {
            console.error(`Error loading ${file}:`, error);
        }
    }

    return data;
}

// Main function to handle year selection and data display
async function main() {
    // Set the default theme based on local storage or system preference
    const isDarkMode = loadThemeIsDarkMode();
    applyTheme(isDarkMode);
    
    // Load all JSON data
    const jsonData = await loadAllJsonData();

    // Define the mapping of file names to table column IDs and keys for YearA and YearB
    const columnMappingYearA = {
        'minimumWage.json': { id: 'yearAMinWage', key: 'min_wage', format: 'cents' },
        'medianPersonalIncome.json': { id: 'yearAMedianIncome', key: 'median_personal_income', format: 'dollars' },
        'averageSalary.json': { id: 'yearAAverageSalary', key: 'avg_salary', format: 'dollars' },
        'averageHomePrice.json': { id: 'yearAAverageHomePrice', key: 'avg_home_price', format: 'dollars' },
        'averageTuitionPrice.json': {
            keys: ['public_4yr', 'private_nonprofit_4yr'],
            ids: {
                'public_4yr': 'yearAPublicTuition',
                'private_nonprofit_4yr': 'yearAPrivateTuition'
            },
            format: 'dollars'
        }
    };

    const columnMappingYearB = {
        'minimumWage.json': { id: 'yearBMinWage', key: 'min_wage', format: 'cents' },
        'medianPersonalIncome.json': { id: 'yearBMedianIncome', key: 'median_personal_income', format: 'dollars' },
        'averageSalary.json': { id: 'yearBAverageSalary', key: 'avg_salary', format: 'dollars' },
        'averageHomePrice.json': { id: 'yearBAverageHomePrice', key: 'avg_home_price', format: 'dollars' },
        'averageTuitionPrice.json': {
            keys: ['public_4yr', 'private_nonprofit_4yr'],
            ids: {
                'public_4yr': 'yearBPublicTuition',
                'private_nonprofit_4yr': 'yearBPrivateTuition'
            },
            format: 'dollars'
        }
    };


    // Populate both select elements
    populateYearOptions(yearASelect, 1980);
    populateYearOptions(yearBSelect, currentYear);
    
    // Add event listeners to the select elements
    yearASelect.addEventListener('change', () => {
        const selectedYear = parseInt(yearASelect.value, 10);
        updateYearData(jsonData, selectedYear, columnMappingYearA);
        updateCalculatedValues(jsonData, selectedYear, true);
        updateComparisons();
    });

    yearBSelect.addEventListener('change', () => {
        const selectedYear = parseInt(yearBSelect.value, 10);
        updateYearData(jsonData, selectedYear, columnMappingYearB);
        updateCalculatedValues(jsonData, selectedYear, false);
        updateComparisons();
    });

    // Initial table update for the default selected years
    updateYearData(jsonData, parseInt(yearASelect.value, 10), columnMappingYearA);
    updateYearData(jsonData, parseInt(yearBSelect.value, 10), columnMappingYearB);
    updateCalculatedValues(jsonData, parseInt(yearASelect.value, 10), true);
    updateCalculatedValues(jsonData, parseInt(yearBSelect.value, 10), false);
    updateComparisons();

    // Add an event listener to the button to toggle the theme
    themeToggleButton.addEventListener('click', () => {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        saveTheme(isDarkMode);
        applyTheme(isDarkMode);
    });
}

// Run the main function
void main();
