// Updated script.js
// This file is the same as the original but with fixes to authentication flow:
// - Properly check login status by calling /user/me on load
// - Ensure login and register requests send credentials (cookies) to the API
// - Use apiFetch helper for consistency (which includes credentials: 'include')
// - Minor defensive fixes around DOM elements

// This function runs when the page loads
window.addEventListener('DOMContentLoaded', init);

// --- GLOBAL API HELPER ---
// 'credentials: "include"' is CRITICAL. It tells fetch to send the session cookie.
const apiFetch = (endpoint, options = {}) => {
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        }
    };
    // Merge options, allowing headers to be overridden/extended
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        }
    };
    return fetch(`http://localhost:8080/api${endpoint}`, mergedOptions);
};

// Global variables to hold references for edit submit functions
let currentEditTransactionSubmitHandler = null;
let currentEditCategorySubmitHandler = null;
let currentEditGoalSubmitHandler = null;

// Application State (will be populated from the backend)
let state = {
    transactions: [],
    categories: [],
    goals: [],
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear()
};

// Chart references
let categoryChart, monthlyChart, incomeExpenseChart, trendsChart;

// ----------------------------------------------------------------------
// --- AUTHENTICATION & UI CONTROL FUNCTIONS (FIXED) ---
// ----------------------------------------------------------------------

/**
 * Checks login status by calling /user/me.
 * If authenticated -> show dashboard; otherwise -> show login screen.
 */
async function checkLoginStatus() {
    try {
        const res = await apiFetch('/user/me', { method: 'GET' });
        if (res.ok) {
            // If user info is returned, proceed to dashboard
            const user = await res.json();
            if (user && user.name) {
                // show dashboard and also set welcome name
                document.querySelector('.user-profile h3').textContent = `Welcome, ${user.name.split(' ')[0]}!`;
            }
            showDashboard();
        } else {
            // Not authenticated
            showLoginScreen();
        }
    } catch (err) {
        console.warn('Failed to verify login status:', err);
        showLoginScreen();
    }
}

/**
 * Sets up the body and login container to display the login form.
 */
function showLoginScreen() {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('app-dashboard');
    const body = document.body;

    if (loginContainer) loginContainer.classList.remove('hidden');
    if (dashboardContainer) dashboardContainer.classList.add('hidden');

    body.classList.add('bg-gray-50', 'flex', 'items-center', 'justify-center', 'min-h-screen');

    showLogin();
}

/**
 * Shows the dashboard and triggers the async init() function to load all data.
 */
function showDashboard() {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('app-dashboard');
    const body = document.body;

    if (loginContainer) loginContainer.classList.add('hidden');
    if (dashboardContainer) dashboardContainer.classList.remove('hidden');

    body.classList.remove('flex', 'items-center', 'justify-center', 'min-h-screen');

    // Kick off the dashboard init (loads data, renders charts, binds events)
    // init() is defined later and will call loadData again; ensure we don't double-bind listeners
    init();
}

/**
 * Logs the user out by calling the backend's logout endpoint.
 */
window.logout = async function() {
    try {
        await apiFetch('/logout', { method: 'POST' });
    } catch (error) {
        console.error("Error logging out:", error);
    } finally {
        state = { transactions: [], categories: [], goals: [] }; // Clear local state
        showLoginScreen();
        displayMessage("Successfully logged out.", 'success');
    }
}

/**
 * Display a temporary message in messageBox
 */
function displayMessage(text, type) {
    const messageBox = document.getElementById('messageBox');
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');

    if (type === 'error') {
        messageBox.classList.add('bg-red-100', 'text-red-700');
    } else if (type === 'success') {
        messageBox.classList.add('bg-green-100', 'text-green-700');
    }
    messageBox.classList.remove('hidden');
}

/* Login / Signup UI toggles (unchanged but defensive) */
window.showSignup = function() {
    const form = document.getElementById('loginForm');
    const backToLoginLink = document.getElementById('backToLogin');
    const signUpLinkContainer = document.querySelector('.mt-6:not(#backToLogin)');
    const messageBox = document.getElementById('messageBox');

    if (!form) return;

    const headerH1 = document.querySelector('#login-container h1');
    if (headerH1) headerH1.textContent = 'Create Account';
    const subP = document.querySelector('#login-container p.text-gray-500');
    if (subP) subP.textContent = 'Join us to start tracking your finances';

    const passwordDiv = document.getElementById('password')?.closest('div');
    const emailInputDiv = document.querySelector('#loginForm div:has(input#email)');

    // 1. Add Name field (inserted before the email field)
    let nameDiv = document.getElementById('name-field');
    if (!nameDiv) {
        nameDiv = document.createElement('div');
        nameDiv.id = 'name-field';
        nameDiv.innerHTML = `
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input
                type="text"
                id="name"
                name="name"
                placeholder="Enter your name"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 input-focus-teal transition duration-150 ease-in-out"
            >
        `;
        if (emailInputDiv) {
            emailInputDiv.before(nameDiv);
        }
    }

    // 2. Add Confirm Password Field
    let confirmPasswordDiv = document.getElementById('confirm-password-field');
    if (!confirmPasswordDiv && passwordDiv) {
        confirmPasswordDiv = document.createElement('div');
        confirmPasswordDiv.innerHTML = `
            <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
                type="password"
                id="confirm-password"
                name="confirm-password"
                placeholder="Confirm your password"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 input-focus-teal transition duration-150 ease-in-out"
            >
        `;
        confirmPasswordDiv.id = 'confirm-password-field';
        passwordDiv.after(confirmPasswordDiv);
    }

    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Sign Up';
    form.classList.add('signup-form');

    if (backToLoginLink) backToLoginLink.classList.remove('hidden');
    if (signUpLinkContainer) signUpLinkContainer.classList.add('hidden');

    if (messageBox) messageBox.classList.add('hidden');
}

window.showLogin = function() {
    const form = document.getElementById('loginForm');
    const backToLoginLink = document.getElementById('backToLogin');
    const signUpLinkContainer = document.querySelector('.mt-6:not(#backToLogin)');
    const messageBox = document.getElementById('messageBox');

    if (!form) return;

    const headerH1 = document.querySelector('#login-container h1');
    if (headerH1) headerH1.textContent = 'Welcome Back';
    const subP = document.querySelector('#login-container p.text-gray-500');
    if (subP) subP.textContent = 'Sign in to track your expenses';

    // Remove Name Field
    const nameField = document.getElementById('name-field');
    if (nameField) {
        nameField.remove();
    }

    // Remove Confirm Password Field
    const confirmPasswordField = document.getElementById('confirm-password-field');
    if (confirmPasswordField) {
        confirmPasswordField.remove();
    }

    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Sign In';
    form.classList.remove('signup-form');

    if (backToLoginLink) backToLoginLink.classList.add('hidden');
    if (signUpLinkContainer) signUpLinkContainer.classList.remove('hidden');

    if (messageBox) messageBox.classList.add('hidden');
}

window.handleGoogleSignIn = function() {
    displayMessage("Simulating Google Sign-In... (Not implemented in this demo)", 'error');
    setTimeout(() => {
        document.getElementById('messageBox')?.classList.add('hidden');
    }, 3000);
}

// ----------------------------------------------------------------------
// --- APP DASHBOARD HELPER FUNCTIONS ---
// ----------------------------------------------------------------------

function formatCurrency(value) {
    if (value === null || value === undefined) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getMonthName(monthIndex) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
}

// ----------------------------------------------------------------------
// --- APP DATA & UI CORE FUNCTIONS ---
// ----------------------------------------------------------------------

/**
 * Fetches all user data from the backend upon login.
 */
async function loadData() {
    try {
        const [categoriesRes, goalsRes, transactionsRes, userRes] = await Promise.all([
            apiFetch('/categories'),
            apiFetch('/goals'),
            apiFetch('/transactions'),
            apiFetch('/user/me')
        ]);

        if (!categoriesRes.ok || !goalsRes.ok || !transactionsRes.ok || !userRes.ok) {
            console.error("Failed to load data, redirecting to login.");
            showLoginScreen();
            return;
        }

        const categories = await categoriesRes.json();
        const goals = await goalsRes.json();
        const transactions = await transactionsRes.json();
        const user = await userRes.json();

        state.categories = categories;

        state.goals = goals.map(goal => ({
            ...goal,
            date: new Date(goal.targetDate)
        }));

        state.transactions = transactions.map(trans => ({
            ...trans,
            date: new Date(trans.transactionDate)
        }));

        if (user && user.name) {
            document.querySelector('.user-profile h3').textContent = `Welcome, ${user.name.split(' ')[0]}!`;
        } else {
            document.querySelector('.user-profile h3').textContent = `Welcome!`;
        }

    } catch (error) {
        console.error("Failed to load data:", error);
        showLoginScreen();
    }
}

/**
 * Deprecated helper left for compatibility.
 */
function saveData() {
    console.log("saveData() is deprecated. Data is saved via API calls.");
}

function toggleTheme() {
    const themeToggle = document.getElementById('theme-icon');
    const body = document.body;
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeToggle.classList.remove('fa-sun');
        themeToggle.classList.add('fa-moon');
    } else {
        body.setAttribute('data-theme', 'dark');
        themeToggle.classList.remove('fa-moon');
        themeToggle.classList.add('fa-sun');
    }
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    resetGoalFormListener();
    resetTransactionFormListener();
    resetCategoryFormListener();
}

function openModal(type) {
    resetGoalFormListener();
    resetTransactionFormListener();
    resetCategoryFormListener();

    closeModal();

    if (type === 'transaction') {
        prepareTransactionModal();
        document.getElementById('transaction-modal').classList.add('active');
    } else if (type === 'category') {
        prepareCategoryModal();
        document.getElementById('category-modal').classList.add('active');
    } else if (type === 'goal') {
        prepareGoalModal();
        document.getElementById('goal-modal').classList.add('active');
    }
}

function resetGoalFormListener() {
    const goalForm = document.getElementById('goal-form');
    if (!goalForm) return;
    if (currentEditGoalSubmitHandler) {
        goalForm.removeEventListener('submit', currentEditGoalSubmitHandler);
        currentEditGoalSubmitHandler = null;
    }
    goalForm.removeEventListener('submit', handleGoalSubmit);
    goalForm.addEventListener('submit', handleGoalSubmit);
    goalForm.reset();
}

function resetTransactionFormListener() {
    const transactionForm = document.getElementById('transaction-form');
    if (!transactionForm) return;
    if (currentEditTransactionSubmitHandler) {
        transactionForm.removeEventListener('submit', currentEditTransactionSubmitHandler);
        currentEditTransactionSubmitHandler = null;
    }
    transactionForm.removeEventListener('submit', handleTransactionSubmit);
    transactionForm.addEventListener('submit', handleTransactionSubmit);
    transactionForm.reset();
}

function resetCategoryFormListener() {
    const categoryForm = document.getElementById('category-form');
    if (!categoryForm) return;
    if (currentEditCategorySubmitHandler) {
        categoryForm.removeEventListener('submit', currentEditCategorySubmitHandler);
        currentEditCategorySubmitHandler = null;
    }
    categoryForm.removeEventListener('submit', handleCategorySubmit);
    categoryForm.addEventListener('submit', handleCategorySubmit);
    categoryForm.reset();
}

function prepareTransactionModal() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('trans-date');
    if (dateInput) dateInput.value = today;

    // Populate category dropdown
    const categorySelect = document.getElementById('trans-category');
    if (categorySelect) {
        categorySelect.innerHTML = '';
        state.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }

    // Populate NEW Goal dropdown
    const goalSelect = document.getElementById('trans-goal');
    if (goalSelect) {
        goalSelect.innerHTML = '<option value="">No Goal Contribution</option>';
        state.goals
            .filter(g => g.targetAmount > g.saved)
            .forEach(goal => {
                const option = document.createElement('option');
                option.value = goal.id;
                option.textContent = `${goal.name} (Target: ${formatCurrency(goal.targetAmount)})`;
                goalSelect.appendChild(option);
            });
    }

    // Show/hide Goal dropdown based on type
    const transTypeSelect = document.getElementById('trans-type');
    if (transTypeSelect) {
        // remove previous listener if any to avoid duplicates
        transTypeSelect.onchange = function() {
            const goalGroup = document.getElementById('goal-selection-group');
            if (this.value === 'income' || this.value === '') {
                if (goalGroup) goalGroup.style.display = 'block';
            } else {
                if (goalGroup) goalGroup.style.display = 'none';
                if (goalSelect) goalSelect.value = '';
            }
        };

        // Initial check
        const goalGroup = document.getElementById('goal-selection-group');
        if (transTypeSelect.value === 'income' || transTypeSelect.value === '') {
            if (goalGroup) goalGroup.style.display = 'block';
        } else {
            if (goalGroup) goalGroup.style.display = 'none';
        }
    }
}

function prepareCategoryModal() {
    const name = document.getElementById('category-name');
    const budget = document.getElementById('category-budget');
    const icon = document.getElementById('category-icon');
    if (name) name.value = '';
    if (budget) budget.value = '';
    if (icon) icon.value = 'fa-utensils';
}

function prepareGoalModal() {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonthFormatted = nextMonth.toISOString().split('T')[0];

    const name = document.getElementById('goal-name');
    const target = document.getElementById('goal-target');
    const monthly = document.getElementById('goal-monthly-contribution');
    const dateInput = document.getElementById('goal-date');

    if (name) name.value = '';
    if (target) target.value = '';
    if (monthly) monthly.value = '0';
    if (dateInput) dateInput.value = nextMonthFormatted;
}

// --- NEW HELPER FUNCTIONS ---
async function refreshGoals() {
    try {
        const goalsRes = await apiFetch('/goals');
        if (!goalsRes.ok) return;
        const goals = await goalsRes.json();
        state.goals = goals.map(goal => ({
            ...goal,
            date: new Date(goal.targetDate)
        }));
    } catch (e) { console.error("Failed to refresh goals", e); }
}

async function refreshTransactions() {
    try {
        const transRes = await apiFetch('/transactions');
        if (!transRes.ok) return;
        const transactions = await transRes.json();
        state.transactions = transactions.map(trans => ({
            ...trans,
            date: new Date(trans.transactionDate)
        }));
    } catch (e) { console.error("Failed to refresh transactions", e); }
}

/**
 * Handles new transaction submission to the backend.
 */
async function handleTransactionSubmit(e) {
    e.preventDefault();
    const transactionForm = document.getElementById('transaction-form');
    if (!transactionForm) return;

    const type = document.getElementById('trans-type').value;
    const amount = parseFloat(document.getElementById('trans-amount').value);
    const description = document.getElementById('trans-description').value;
    const categoryId = parseInt(document.getElementById('trans-category').value);
    const date = new Date(document.getElementById('trans-date').value);
    const goalId = document.getElementById('trans-goal').value ? parseInt(document.getElementById('trans-goal').value) : null;

    const category = state.categories.find(cat => cat.id === categoryId);

    if (goalId && type === 'expense') {
        displayMessage("Goal contributions should be linked to Income.", 'error');
        return;
    }

    const newTransactionData = {
        type,
        amount,
        description,
        categoryId,
        goalId,
        transactionDate: date.toISOString().split('T')[0],
        category: category ? category.name : undefined,
        icon: category ? category.icon : undefined
    };

    try {
        const response = await apiFetch('/transactions', {
            method: 'POST',
            body: JSON.stringify(newTransactionData)
        });

        if (!response.ok) throw new Error('Failed to save transaction');
        const savedTransaction = await response.json();

        state.transactions.push({
            ...savedTransaction,
            date: new Date(savedTransaction.transactionDate)
        });

        if (goalId) await refreshGoals();

        closeModal();
        updateSummaryCards();
        renderRecentTransactions();
        renderTransactionsTable();
        renderCharts();
        if (goalId) renderGoals();

        transactionForm.reset();
    } catch (error) {
        console.error("Error saving transaction:", error);
        displayMessage("Failed to save transaction.", "error");
    }
}

/**
 * Handles new category submission to the backend.
 */
async function handleCategorySubmit(e) {
    e.preventDefault();
    const categoryForm = document.getElementById('category-form');
    if (!categoryForm) return;

    const newCategoryData = {
        name: document.getElementById('category-name').value,
        budget: parseFloat(document.getElementById('category-budget').value),
        icon: document.getElementById('category-icon').value,
        color: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#00CC99', '#FF9F40'][Math.floor(Math.random() * 7)]
    };

    try {
        const response = await apiFetch('/categories', {
            method: 'POST',
            body: JSON.stringify(newCategoryData)
        });
        if (!response.ok) throw new Error("Failed to save");

        const savedCategory = await response.json();
        state.categories.push(savedCategory);

        closeModal();
        renderCategories();
        renderCharts();
        categoryForm.reset();
    } catch (error) {
        console.error("Error saving category:", error);
    }
}

/**
 * Handles new goal submission to the backend.
 */
async function handleGoalSubmit(e) {
    e.preventDefault();
    const goalForm = document.getElementById('goal-form');
    if (!goalForm) return;

    const newGoalData = {
        name: document.getElementById('goal-name').value,
        targetAmount: parseFloat(document.getElementById('goal-target').value),
        targetDate: new Date(document.getElementById('goal-date').value).toISOString().split('T')[0],
        monthlyContribution: parseFloat(document.getElementById('goal-monthly-contribution').value),
        saved: 0
    };

    try {
        const response = await apiFetch('/goals', {
            method: 'POST',
            body: JSON.stringify(newGoalData)
        });
        if (!response.ok) throw new Error("Failed to save");

        const savedGoal = await response.json();
        state.goals.push({
            ...savedGoal,
            date: new Date(savedGoal.targetDate)
        });

        closeModal();
        renderGoals();
        goalForm.reset();
    } catch (error) {
        console.error("Error saving goal:", error);
    }
}

/**
 * Update the summary cards on dashboard.
 */
function updateSummaryCards() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = state.transactions.filter(trans => {
        return trans.date.getMonth() === currentMonth && trans.date.getFullYear() === currentYear;
    });

    const income = monthlyTransactions
        .filter(trans => trans.type === 'income')
        .reduce((sum, trans) => sum + trans.amount, 0);

    const expenses = monthlyTransactions
        .filter(trans => trans.type === 'expense')
        .reduce((sum, trans) => sum + trans.amount, 0);

    const balance = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income * 100).toFixed(1) : 0;

    const totalBalanceEl = document.getElementById('total-balance');
    const monthlyIncomeEl = document.getElementById('monthly-income');
    const monthlyExpensesEl = document.getElementById('monthly-expenses');
    const savingsRateEl = document.getElementById('savings-rate');

    if (totalBalanceEl) totalBalanceEl.textContent = formatCurrency(balance);
    if (monthlyIncomeEl) monthlyIncomeEl.textContent = formatCurrency(income);
    if (monthlyExpensesEl) monthlyExpensesEl.textContent = formatCurrency(expenses);
    if (savingsRateEl) savingsRateEl.textContent = `${savingsRate}%`;

    const changeElement = document.querySelector('#total-balance + .change');
    if (changeElement) {
        if (balance > 0) {
            changeElement.classList.add('positive');
            changeElement.classList.remove('negative');
        } else if (balance < 0) {
            changeElement.classList.add('negative');
            changeElement.classList.remove('positive');
        } else {
            changeElement.classList.remove('positive', 'negative');
        }
    }
}

/**
 * Render recent transactions list.
 */
function renderRecentTransactions() {
    const container = document.getElementById('recent-transactions');
    if (!container) return;
    container.innerHTML = '';

    const recentTransactions = [...state.transactions]
        .sort((a, b) => b.date - a.date)
        .slice(0, 5);

    if (recentTransactions.length === 0) {
        container.innerHTML = '<p class="no-transactions">No transactions yet. Add your first transaction!</p>';
        return;
    }

    recentTransactions.forEach(trans => {
        const transactionEl = document.createElement('div');
        transactionEl.className = 'transaction-item';

        transactionEl.innerHTML = `
            <div class="transaction-info">
                <div class="transaction-icon">
                    <i class="fas ${trans.icon || 'fa-money-bill-wave'}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${trans.description}</h4>
                    <p>${trans.category || 'Uncategorized'} • ${formatDate(trans.date)}</p>
                </div>
            </div>
            <div class="transaction-amount ${trans.type}">
                ${trans.type === 'income' ? '+' : '-'}₹${formatCurrency(trans.amount).replace('₹', '')}
            </div>
        `;

        container.appendChild(transactionEl);
    });
}

/**
 * Render transactions table with filters.
 */
function renderTransactionsTable() {
    const container = document.getElementById('transactions-list');
    if (!container) return;
    container.innerHTML = '';

    const typeFilter = document.getElementById('transaction-type')?.value || 'all';
    const categoryFilter = document.getElementById('transaction-category')?.value || 'all';
    const monthFilter = document.getElementById('transaction-month')?.value || 'all';

    const categorySelect = document.getElementById('transaction-category');
    if (categorySelect) {
        categorySelect.querySelectorAll('option:not(:first-child)').forEach(option => option.remove());
        state.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }

    const monthSelect = document.getElementById('transaction-month');
    if (monthSelect) {
        monthSelect.querySelectorAll('option:not(:first-child)').forEach(option => option.remove());
        const months = {};
        state.transactions
            .sort((a, b) => b.date - a.date)
            .forEach(trans => {
                const monthYear = `${trans.date.getFullYear()}-${trans.date.getMonth()}`;
                if (!months[monthYear]) {
                    months[monthYear] = true;
                    const option = document.createElement('option');
                    option.value = monthYear;
                    option.textContent = `${getMonthName(trans.date.getMonth())} ${trans.date.getFullYear()}`;
                    monthSelect.appendChild(option);
                }
            });
    }

    let filteredTransactions = [...state.transactions];

    if (typeFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(trans => trans.type === typeFilter);
    }

    if (categoryFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(trans => trans.categoryId === parseInt(categoryFilter));
    }

    if (monthFilter !== 'all') {
        const [year, month] = monthFilter.split('-').map(Number);
        filteredTransactions = filteredTransactions.filter(trans => {
            return trans.date.getFullYear() === year && trans.date.getMonth() === month;
        });
    }

    filteredTransactions.sort((a, b) => b.date - a.date);

    if (filteredTransactions.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="no-transactions">No transactions found matching your filters.</td>
            </tr>
        `;
        return;
    }

    filteredTransactions.forEach(trans => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${formatDate(trans.date)}</td>
            <td>${trans.description}</td>
            <td>
                <i class="fas ${trans.icon || 'fa-money-bill-wave'}"></i>
                ${trans.category || 'Uncategorized'}
            </td>
            <td>
                <span class="badge ${trans.type === 'income' ? 'income' : 'expense'}">
                    ${trans.type === 'income' ? 'Income' : 'Expense'}
                </span>
            </td>
            <td class="${trans.type === 'income' ? 'income' : 'expense'}">
                ${trans.type === 'income' ? '+' : '-'} ${formatCurrency(trans.amount)}
            </td>
            <td class="action-buttons">
                <button class="action-btn edit-btn" data-id="${trans.id}" title="Edit Transaction">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-id="${trans.id}" title="Delete Transaction">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        container.appendChild(row);
    });
}

/**
 * Handles editing a transaction.
 */
async function editTransaction(id) {
    const transaction = state.transactions.find(trans => trans.id === id);
    if (!transaction) return;
    const transactionForm = document.getElementById('transaction-form');
    if (!transactionForm) return;

    openModal('transaction');

    document.getElementById('trans-type').value = transaction.type;
    document.getElementById('trans-amount').value = transaction.amount;
    document.getElementById('trans-description').value = transaction.description;
    document.getElementById('trans-category').value = transaction.categoryId;
    document.getElementById('trans-date').value = transaction.date.toISOString().split('T')[0];
    document.getElementById('trans-goal').value = transaction.goalId || '';

    currentEditTransactionSubmitHandler = async function handleEditSubmit(e) {
        e.preventDefault();

        const oldGoalId = transaction.goalId;
        const newGoalId = document.getElementById('trans-goal').value ? parseInt(document.getElementById('trans-goal').value) : null;

        const updatedTransactionData = {
            id: transaction.id,
            type: document.getElementById('trans-type').value,
            amount: parseFloat(document.getElementById('trans-amount').value),
            description: document.getElementById('trans-description').value,
            categoryId: parseInt(document.getElementById('trans-category').value),
            transactionDate: new Date(document.getElementById('trans-date').value).toISOString().split('T')[0],
            goalId: newGoalId
        };

        try {
            const response = await apiFetch(`/transactions/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedTransactionData)
            });
            if (!response.ok) throw new Error("Failed to update");

            const category = state.categories.find(cat => cat.id === updatedTransactionData.categoryId);

            const index = state.transactions.findIndex(t => t.id === id);
            if (index !== -1) {
                state.transactions[index] = {
                    ...updatedTransactionData,
                    date: new Date(updatedTransactionData.transactionDate),
                    category: category ? category.name : undefined,
                    icon: category ? category.icon : undefined
                };
            }

            if (oldGoalId !== newGoalId) await refreshGoals();

            closeModal();
            updateSummaryCards();
            renderRecentTransactions();
            renderTransactionsTable();
            renderCharts();
            if (oldGoalId !== newGoalId) renderGoals();

        } catch (error) {
            console.error("Error updating transaction:", error);
        }
    };

    transactionForm.removeEventListener('submit', handleTransactionSubmit);
    transactionForm.addEventListener('submit', currentEditTransactionSubmitHandler);
}

/**
 * Delete transaction
 */
async function deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        try {
            const transaction = state.transactions.find(trans => trans.id === id);
            const goalId = transaction?.goalId;

            const response = await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error("Failed to delete");

            state.transactions = state.transactions.filter(trans => trans.id !== id);

            if (goalId) await refreshGoals();

            updateSummaryCards();
            renderRecentTransactions();
            renderTransactionsTable();
            renderCharts();
            if (goalId) renderGoals();

        } catch (error) {
            console.error("Error deleting transaction:", error);
        }
    }
}

/**
 * Render categories (budget view)
 */
function renderCategories() {
    const container = document.getElementById('budget-categories');
    if (!container) return;
    container.innerHTML = '';
    const budgetCategoriesContainer = document.getElementById('budget-categories');

    if (!state.categories || state.categories.length === 0) {
        container.innerHTML = '<p class="no-categories">No categories yet. Add your first category!</p>';
        return;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const categorySpending = {};
    state.transactions
        .filter(trans => trans.type === 'expense' &&
            trans.date.getMonth() === currentMonth &&
            trans.date.getFullYear() === currentYear)
        .forEach(trans => {
            const categoryId = parseInt(trans.categoryId);
            if (!categorySpending[categoryId]) {
                categorySpending[categoryId] = 0;
            }
            categorySpending[categoryId] += trans.amount;
        });

    state.categories.forEach(category => {
        if (category.name === 'Income') return;

        const spent = categorySpending[category.id] || 0;
        const percentage = category.budget > 0 ? Math.min((spent / category.budget) * 100, 100) : 0;
        const remaining = category.budget - spent;

        const categoryEl = document.createElement('div');
        categoryEl.className = 'budget-category';

        categoryEl.innerHTML = `
            <div class="budget-category-header">
                <div class="budget-icon" style="background-color: ${category.color || '#4361ee'}">
                    <i class="fas ${category.icon}"></i>
                </div>
                <div class="budget-title">
                    <h3>${category.name}</h3>
                    <p>Budget: ${formatCurrency(category.budget)}</p>
                </div>
                <div class="category-actions">
                    <button class="edit-category-btn" data-id="${category.id}" title="Edit Category">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-category-btn" data-id="${category.id}" title="Delete Category">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="budget-amount">
                Spent: ${formatCurrency(spent)} / Remaining: 
                ${formatCurrency(remaining)}
            </div>
            <div class="budget-progress">
                <div class="budget-progress-bar" style="width: ${percentage}%; background-color: ${category.color || '#4361ee'}"></div>
            </div>
            <div class="budget-stats">
                <span>${percentage.toFixed(0)}% of budget</span>
                <span class="${remaining < 0 ? 'negative-text' : ''}">${formatCurrency(remaining)} left</span>
            </div>
        `;

        container.appendChild(categoryEl);
    });
}

/**
 * Edit category flow
 */
async function editCategory(id) {
    const category = state.categories.find(cat => cat.id === id);
    if (!category) return;
    const categoryForm = document.getElementById('category-form');
    if (!categoryForm) return;

    openModal('category');

    document.getElementById('category-name').value = category.name;
    document.getElementById('category-budget').value = category.budget;
    document.getElementById('category-icon').value = category.icon;

    categoryForm.removeEventListener('submit', handleCategorySubmit);

    currentEditCategorySubmitHandler = async function handleCategoryEdit(e) {
        e.preventDefault();

        const updatedCategoryData = {
            id: category.id,
            name: document.getElementById('category-name').value,
            budget: parseFloat(document.getElementById('category-budget').value),
            icon: document.getElementById('category-icon').value,
            color: category.color
        };

        try {
            const response = await apiFetch(`/categories/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedCategoryData)
            });
            if (!response.ok) throw new Error("Failed to update");

            const index = state.categories.findIndex(c => c.id === id);
            if (index !== -1) {
                state.categories[index] = updatedCategoryData;
            }

            closeModal();
            renderCategories();
            renderCharts();
            await refreshTransactions();
            renderTransactionsTable();

        } catch (error) {
            console.error("Error updating category:", error);
        }
    };
    categoryForm.addEventListener('submit', currentEditCategorySubmitHandler);
}

/**
 * Delete category flow
 */
async function deleteCategory(id) {
    const transactionsInUse = state.transactions.filter(t => t.categoryId === id).length;
    if (transactionsInUse > 0) {
        alert('Cannot delete category. Please delete or re-assign all transactions using this category first.');
        return;
    }

    if (confirm('Are you sure you want to delete this category?')) {
        try {
            const response = await apiFetch(`/categories/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error("Failed to delete");

            state.categories = state.categories.filter(cat => cat.id !== id);

            renderCategories();
            renderTransactionsTable();
            renderCharts();

        } catch (error) {
            console.error("Error deleting category:", error);
            displayMessage("Could not delete category.", "error");
        }
    }
}

/**
 * Render goals
 */
function renderGoals() {
    const container = document.getElementById('savings-goals');
    if (!container) return;
    container.innerHTML = '';

    if (!state.goals || state.goals.length === 0) {
        container.innerHTML = '<p class="no-goals">No savings goals yet. Add your first goal!</p>';
        return;
    }

    state.goals.forEach(goal => {
        const percentage = (goal.saved / goal.targetAmount) * 100;
        const remainingToSave = goal.targetAmount - goal.saved;
        const daysLeft = Math.ceil(Math.max(0, (new Date(goal.date) - new Date()) / (1000 * 60 * 60 * 24)));
        const monthsLeft = Math.max(daysLeft / 30.44, 1);

        let statusText = 'On Track';
        let statusColor = '#10b981';
        const requiredMonthlySaving = remainingToSave / monthsLeft;

        if (goal.saved >= goal.targetAmount) {
            statusText = 'Completed!';
            statusColor = '#059669';
        } else if (daysLeft <= 0) {
            statusText = 'Overdue';
            statusColor = '#f94144';
        } else if (goal.monthlyContribution > 0 && goal.monthlyContribution < requiredMonthlySaving) {
            statusText = 'Behind Schedule';
            statusColor = '#f59e0b';
        } else if (goal.monthlyContribution === 0 && remainingToSave > 0) {
            statusText = 'Needs Contribution';
            statusColor = '#ef4444';
        }

        const goalEl = document.createElement('div');
        goalEl.className = 'goal-card';
        goalEl.style.borderLeft = `4px solid ${statusColor}`;

        goalEl.innerHTML = `
            <div class="goal-header">
                <div class="goal-title">
                    <h3>${goal.name}</h3>
                    <p>Target: ${formatCurrency(goal.targetAmount)}</p>
                </div>
                <div class="goal-actions">
                    <button class="action-btn edit-goal-btn" data-id="${goal.id}" title="Edit Goal">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-goal-btn" data-id="${goal.id}" title="Delete Goal">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="goal-amount-status">
                <span class="goal-saved-amount">Saved: ${formatCurrency(goal.saved)}</span>
                <span class="goal-percentage">${percentage.toFixed(1)}%</span>
            </div>
            <div class="goal-progress">
                <div class="goal-progress-bar" style="width: ${Math.min(percentage, 100)}%; background-color: ${statusColor}"></div>
            </div>
            <div class="goal-details">
                <span class="goal-status" style="color: ${statusColor}; font-weight: 600;">${statusText}</span>
                <span class="goal-date">Target Date: ${formatDate(goal.date)}</span>
            </div>
        `;

        container.appendChild(goalEl);
    });
}

/**
 * Edit goal flow
 */
async function editGoal(id) {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;
    const goalForm = document.getElementById('goal-form');
    if (!goalForm) return;

    openModal('goal');

    document.getElementById('goal-name').value = goal.name;
    document.getElementById('goal-target').value = goal.targetAmount;
    document.getElementById('goal-monthly-contribution').value = goal.monthlyContribution;
    document.getElementById('goal-date').value = goal.date.toISOString().split('T')[0];

    goalForm.removeEventListener('submit', handleGoalSubmit);

    currentEditGoalSubmitHandler = async function handleGoalEdit(e) {
        e.preventDefault();

        const updatedGoalData = {
            id: goal.id,
            name: document.getElementById('goal-name').value,
            targetAmount: parseFloat(document.getElementById('goal-target').value),
            monthlyContribution: parseFloat(document.getElementById('goal-monthly-contribution').value),
            targetDate: new Date(document.getElementById('goal-date').value).toISOString().split('T')[0],
            saved: goal.saved
        };

        try {
            const response = await apiFetch(`/goals/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedGoalData)
            });
            if (!response.ok) throw new Error("Failed to update");

            const index = state.goals.findIndex(g => g.id === id);
            if (index !== -1) {
                state.goals[index] = {
                    ...goal,
                    ...updatedGoalData,
                    date: new Date(updatedGoalData.targetDate)
                };
            }

            closeModal();
            renderGoals();
        } catch (error) {
            console.error("Error updating goal:", error);
        }
    };
    goalForm.addEventListener('submit', currentEditGoalSubmitHandler);
}

/**
 * Delete goal flow
 */
async function deleteGoal(id) {
    if (confirm('Are you sure you want to delete this savings goal? All associated transaction links will be cleared.')) {
        try {
            const response = await apiFetch(`/goals/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error("Failed to delete");

            state.goals = state.goals.filter(g => g.id !== id);
            await refreshTransactions();

            renderGoals();
            renderTransactionsTable();
        } catch (error) {
            console.error("Error deleting goal:", error);
        }
    }
}

/**
 * Render all charts (delegates)
 */
function renderCharts() {
    renderCategoryChart();
    renderMonthlyChart();
    renderIncomeExpenseChart();
    renderTrendsChart();
    renderTopExpenses();
    renderCategoryBreakdown();
}

/**
 * Render category doughnut chart
 */
function renderCategoryChart() {
    const ctx = document.getElementById('categoryChart')?.getContext('2d');
    if (!ctx) return;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const categorySpending = {};
    state.transactions
        .filter(trans => trans.type === 'expense' &&
            trans.date.getMonth() === currentMonth &&
            trans.date.getFullYear() === currentYear)
        .forEach(trans => {
            if (!categorySpending[trans.categoryId]) {
                categorySpending[trans.categoryId] = 0;
            }
            categorySpending[trans.categoryId] += trans.amount;
        });

    const categories = state.categories.filter(cat => cat.name !== 'Income');
    const labels = categories.map(cat => cat.name);
    const data = categories.map(cat => categorySpending[cat.id] || 0);
    const backgroundColors = categories.map(cat => cat.color || '#4361ee');

    if (categoryChart) {
        categoryChart.destroy();
    }

    const totalSpending = data.reduce((sum, val) => sum + val, 0);

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 1,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            aspectRatio: 1.5,
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1000,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            family: 'Poppins',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = totalSpending > 0 ? ((value / totalSpending) * 100).toFixed(1) : 0;
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                },
                title: {
                    display: totalSpending === 0,
                    text: 'No expenses recorded this month.',
                    font: { size: 14 }
                }
            }
        }
    });
}

/**
 * Render monthly bar chart
 */
function renderMonthlyChart() {
    const ctx = document.getElementById('monthlyChart')?.getContext('2d');
    if (!ctx) return;
    const monthlyData = {};

    state.transactions.forEach(trans => {
        const monthYear = `${trans.date.getFullYear()}-${trans.date.getMonth()}`;
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = {
                income: 0, expenses: 0, month: trans.date.getMonth(), year: trans.date.getFullYear()
            };
        }
        if (trans.type === 'income') {
            monthlyData[monthYear].income += trans.amount;
        } else {
            monthlyData[monthYear].expenses += trans.amount;
        }
    });

    const sortedMonths = Object.values(monthlyData).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });

    const last6Months = sortedMonths.slice(-6);
    const labels = last6Months.map(month =>
        `${getMonthName(month.month)} ${month.year.toString().slice(2)}`
    );
    const incomeData = last6Months.map(month => month.income);
    const expensesData = last6Months.map(month => month.expenses);

    if (monthlyChart) {
        monthlyChart.destroy();
    }

    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Income', data: incomeData, backgroundColor: '#4cc9f0', borderColor: '#4cc9f0', borderWidth: 1 },
                { label: 'Expenses', data: expensesData, backgroundColor: '#f94144', borderColor: '#f94144', borderWidth: 1 }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value).replace('₹', '₹');
                        },
                        font: { family: 'Poppins' }
                    },
                    grid: { drawOnChartArea: false }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Poppins' } }
                }
            },
            plugins: {
                legend: { position: 'top', labels: { font: { family: 'Poppins' } } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${formatCurrency(value)}`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render income vs expenses pie chart
 */
function renderIncomeExpenseChart() {
    const ctx = document.getElementById('incomeExpenseChart')?.getContext('2d');
    if (!ctx) return;
    const monthTransactions = state.transactions.filter(trans => {
        return trans.date.getMonth() === state.currentMonth && trans.date.getFullYear() === state.currentYear;
    });

    const income = monthTransactions
        .filter(trans => trans.type === 'income').reduce((sum, trans) => sum + trans.amount, 0);
    const expenses = monthTransactions
        .filter(trans => trans.type === 'expense').reduce((sum, trans) => sum + trans.amount, 0);

    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }

    incomeExpenseChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Income', 'Expenses'],
            datasets: [{
                data: [income, expenses],
                backgroundColor: ['#4cc9f0', '#f94144'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1000,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: { position: 'right' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render trends line chart
 */
function renderTrendsChart() {
    const ctx = document.getElementById('trendsChart')?.getContext('2d');
    if (!ctx) return;
    const monthlyTrendsMap = {};

    state.transactions.forEach(trans => {
        const dateKey = `${trans.date.getFullYear()}-${trans.date.getMonth()}`;
        if (!monthlyTrendsMap[dateKey]) {
            monthlyTrendsMap[dateKey] = {
                month: trans.date.getMonth(), year: trans.date.getFullYear(), income: 0, expenses: 0, balance: 0,
                label: `${getMonthName(trans.date.getMonth())} ${trans.date.getFullYear().toString().slice(2)}`
            };
        }
        if (trans.type === 'income') {
            monthlyTrendsMap[dateKey].income += trans.amount;
        } else {
            monthlyTrendsMap[dateKey].expenses += trans.amount;
        }
    });

    const monthlyTrends = Object.values(monthlyTrendsMap).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    }).map(monthData => ({ ...monthData, balance: monthData.income - monthData.expenses }));

    const last12Months = monthlyTrends.slice(-12);
    const labels = last12Months.map(month => month.label);
    const incomeData = last12Months.map(month => month.income);
    const expensesData = last12Months.map(month => month.expenses);
    const balanceData = last12Months.map(month => month.balance);

    if (trendsChart) {
        trendsChart.destroy();
    }

    trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderColor: '#10b981',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHitRadius: 5
                }, {
                    label: 'Expenses',
                    data: expensesData,
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHitRadius: 5
                }, {
                    label: 'Balance',
                    data: balanceData,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: '#4bc0c0',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: false,
                    pointRadius: 0,
                    pointHitRadius: 5,
                    borderDash: [5, 5],
                    pointStyle: 'line'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value).replace('₹', '₹');
                        },
                        font: { family: 'Poppins' }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Poppins' } }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { family: 'Poppins' },
                        usePointStyle: true,
                        generateLabels: function(chart) {
                            const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                            if (labels.length > 2) {
                                labels[2].fillStyle = 'rgba(0, 0, 0, 0)';
                                labels[2].strokeStyle = '#4bc0c0';
                                labels[2].lineWidth = 3;
                                labels[2].lineDash = [5, 5];
                                labels[2].pointStyle = false;
                            }
                            return labels;
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${formatCurrency(value)}`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Top expenses list
 */
function renderTopExpenses() {
    const container = document.getElementById('top-expenses');
    if (!container) return;
    container.innerHTML = '';
    const monthExpenses = state.transactions.filter(trans => {
        return trans.type === 'expense' && trans.date.getMonth() === state.currentMonth && trans.date.getFullYear() === state.currentYear;
    });
    const sortedExpenses = [...monthExpenses].sort((a, b) => b.amount - a.amount);
    const topExpenses = sortedExpenses.slice(0, 5);

    if (topExpenses.length === 0) {
        container.innerHTML = '<li>No expenses this month</li>';
        return;
    }

    topExpenses.forEach(expense => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>
                <i class="fas ${expense.icon || 'fa-money-bill-wave'}"></i>
                ${expense.description} (${expense.category || 'Uncategorized'})
            </span>
            <span class="expense">${formatCurrency(expense.amount)}</span>
        `;
        container.appendChild(li);
    });
}

/**
 * Category breakdown list
 */
function renderCategoryBreakdown() {
    const container = document.getElementById('category-breakdown');
    if (!container) return;
    container.innerHTML = '';
    const monthExpenses = state.transactions.filter(trans => {
        return trans.type === 'expense' && trans.date.getMonth() === state.currentMonth && trans.date.getFullYear() === state.currentYear;
    });

    const totalExpenses = monthExpenses.reduce((sum, trans) => sum + trans.amount, 0);
    const categoryTotals = {};
    monthExpenses.forEach(expense => {
        if (!categoryTotals[expense.categoryId]) {
            categoryTotals[expense.categoryId] = 0;
        }
        categoryTotals[expense.categoryId] += expense.amount;
    });

    const categoryArray = Object.entries(categoryTotals)
        .map(([categoryId, amount]) => {
            const category = state.categories.find(cat => cat.id === parseInt(categoryId));
            return {
                name: category?.name || 'Unknown', amount,
                percentage: totalExpenses > 0 ? (amount / totalExpenses * 100) : 0,
                color: category?.color || '#4361ee'
            };
        })
        .sort((a, b) => b.amount - a.amount);

    if (categoryArray.length === 0) {
        container.innerHTML = '<li>No expenses this month</li>';
        return;
    }

    categoryArray.forEach(category => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>
                <span class="color-indicator" style="background-color: ${category.color}"></span>
                ${category.name}
            </span>
            <span>${category.percentage.toFixed(1)}% (${formatCurrency(category.amount)})</span>
        `;
        container.appendChild(li);
    });
}

/**
 * Set current month/year label
 */
function setCurrentMonthYear() {
    const monthName = getMonthName(state.currentMonth);
    const el = document.getElementById('current-month');
    if (el) el.textContent = `${monthName} ${state.currentYear}`;
}

/**
 * Render dashboard pieces
 */
function renderDashboard() {
    updateSummaryCards();
    renderRecentTransactions();
}

/**
 * Handle click actions on transactions list (edit/delete)
 */
function handleTransactionAction(e) {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (editBtn) {
        const id = parseInt(editBtn.dataset.id);
        editTransaction(id);
    }

    if (deleteBtn) {
        const id = parseInt(deleteBtn.dataset.id);
        deleteTransaction(id);
    }
}

/**
 * Handle category action clicks
 */
function handleCategoryAction(e) {
    const editBtn = e.target.closest('.edit-category-btn');
    const deleteBtn = e.target.closest('.delete-category-btn');

    if (editBtn) {
        const id = parseInt(editBtn.dataset.id);
        editCategory(id);
    }

    if (deleteBtn) {
        const id = parseInt(deleteBtn.dataset.id);
        deleteCategory(id);
    }
}

/**
 * Handle goal action clicks
 */
function handleGoalAction(e) {
    const editBtn = e.target.closest('.edit-goal-btn');
    const deleteBtn = e.target.closest('.delete-goal-btn');

    if (editBtn) {
        const id = parseInt(editBtn.dataset.id);
        editGoal(id);
    }

    if (deleteBtn) {
        const id = parseInt(deleteBtn.dataset.id);
        deleteGoal(id);
    }
}

/**
 * Setup UI event listeners (single entry)
 */
function setupEventListeners() {
    const navItems = document.querySelectorAll('.main-nav li');
    const contentSections = document.querySelectorAll('.content-section');
    const transactionsListContainer = document.getElementById('transactions-list');
    const budgetCategoriesContainer = document.getElementById('budget-categories');
    const goalsContainer = document.getElementById('savings-goals');
    const transactionForm = document.getElementById('transaction-form');
    const categoryForm = document.getElementById('category-form');
    const goalForm = document.getElementById('goal-form');

    document.getElementById('theme-icon')?.addEventListener('click', toggleTheme);

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const section = item.getAttribute('data-section');
            contentSections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(section).classList.add('active');

            if (section === 'transactions') { renderTransactionsTable(); }
            else if (section === 'budgets') { renderCategories(); }
            else if (section === 'reports') { renderCharts(); }
            else if (section === 'goals') { renderGoals(); }
        });
    });

    document.getElementById('add-transaction')?.addEventListener('click', () => openModal('transaction'));
    document.getElementById('add-category')?.addEventListener('click', () => openModal('category'));
    document.getElementById('add-goal')?.addEventListener('click', () => openModal('goal'));
    document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', closeModal));
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) { closeModal(); }
    });

    transactionsListContainer?.addEventListener('click', handleTransactionAction);
    budgetCategoriesContainer?.addEventListener('click', handleCategoryAction);
    goalsContainer?.addEventListener('click', handleGoalAction);

    document.getElementById('prev-month')?.addEventListener('click', () => {
        if (state.currentMonth === 0) { state.currentMonth = 11; state.currentYear--; }
        else { state.currentMonth--; }
        setCurrentMonthYear(); renderCharts();
    });

    document.getElementById('next-month')?.addEventListener('click', () => {
        if (state.currentMonth === 11) { state.currentMonth = 0; state.currentYear++; }
        else { state.currentMonth++; }
        setCurrentMonthYear(); renderCharts();
    });

    document.getElementById('transaction-type')?.addEventListener('change', renderTransactionsTable);
    document.getElementById('transaction-category')?.addEventListener('change', renderTransactionsTable);
    document.getElementById('transaction-month')?.addEventListener('change', renderTransactionsTable);

    // Avoid adding multiple listeners by checking references (optional improvement)
    const loginForm = document.getElementById('loginForm');
    if (loginForm && !loginForm.__loginListenerAttached) {
        // attach login handler (see DOMContentLoaded block below) - we rely on that instead to attach once
        loginForm.__loginListenerAttached = true;
    }
}

/**
 * Main entry point for the dashboard.
 */
async function init() {
    // If we already have data, don't re-attach event listeners multiple times
    await loadData();
    setupEventListeners();

    renderCategories();
    setCurrentMonthYear();

    updateSummaryCards();
    renderRecentTransactions();
    renderCharts();
    renderGoals();
}

// --- DOMContentLoaded for initial setup and Login/Signup form handling ---
document.addEventListener('DOMContentLoaded', function() {

    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Instead of blindly showing dashboard, verify session first
    checkLoginStatus();

    // Ensure we don't attach multiple handlers if this script is re-executed
    if (form && !form.__submitHandlerAttached) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();

            // These variables are guaranteed to exist, as they are part of the base form
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value.trim() : '';
            const apiBaseUrl = 'http://localhost:8080/api';

            if (email === '' || password === '') {
                displayMessage("Please enter both email and password.", 'error');
                return;
            }

            if (form.classList.contains('signup-form')) {
                // --- SIGN UP LOGIC (ACCESSING DYNAMIC FIELDS SAFELY) ---

                // 1. Safely access the Name field
                const nameInput = document.getElementById('name');
                const name = nameInput ? nameInput.value.trim() : 'User';

                // 2. Safely access the Confirm Password field
                const confirmPasswordInput = document.getElementById('confirm-password');

                // Check if the element was found before reading its value
                const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

                if (password !== confirmPassword) {
                    displayMessage('Passwords do not match.', 'error');
                    return;
                }

                try {
                    // Use fetch with credentials included (cookies)
                    const response = await fetch(`${apiBaseUrl}/register`, {
                        method: 'POST',
                        credentials: 'include', // important to allow cookies if server sets any during registration
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, email, password })
                    });

                    if (response.status === 201) {
                        displayMessage(`Account created for ${name}! Please sign in.`, 'success');
                        setTimeout(showLogin, 2000);
                    } else if (response.status === 409) {
                        displayMessage('Email already in use.', 'error');
                    } else {
                        displayMessage('Registration failed. Server error.', 'error');
                    }
                } catch (error) {
                    displayMessage('Registration failed. Server may be down.', 'error');
                }

            } else {
                // --- SIGN IN LOGIC ---

                // Using URLSearchParams because backend (Spring Security often) expects form-encoded body
                const formData = new URLSearchParams();
                formData.append('username', email);
                formData.append('password', password);

                try {
                    // IMPORTANT: include credentials so browser sends and accepts cookies (session cookie)
                    const response = await fetch(`${apiBaseUrl}/login`, {
                        method: 'POST',
                        credentials: 'include', // <-- CRITICAL FIX
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: formData.toString()
                    });

                    if (response.ok) {
                        // Login was successful, but server may have set a cookie. Verify session by calling /user/me
                        displayMessage("Sign In Successful! Loading dashboard...", 'success');

                        // Wait a short moment to ensure cookie is stored, then verify
                        setTimeout(async () => {
                            try {
                                const meRes = await apiFetch('/user/me', { method: 'GET' });
                                if (meRes.ok) {
                                    const user = await meRes.json();
                                    if (user && user.name) {
                                        document.querySelector('.user-profile h3').textContent = `Welcome, ${user.name.split(' ')[0]}!`;
                                    }
                                    document.getElementById('messageBox')?.classList.add('hidden');
                                    emailInput.value = '';
                                    passwordInput.value = '';
                                    showDashboard();
                                } else {
                                    // Something's wrong: session cookie not present or server rejected it
                                    displayMessage('Sign in succeeded but session not established. Please ensure cookies are enabled and server allows credentials.', 'error');
                                }
                            } catch (err) {
                                console.error('Failed to verify session after login:', err);
                                displayMessage('Sign in succeeded but session verification failed.', 'error');
                            }
                        }, 300);
                    } else {
                        displayMessage(`Invalid email or password.`, 'error');
                    }
                } catch (error) {
                    displayMessage('Sign in failed. Server may be down.', 'error');
                }
            }
        });

        form.__submitHandlerAttached = true;
    }
});