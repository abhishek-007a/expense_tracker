// Updated script.js with Dark Mode Persistence, Chart Theme Sync & CSV Export

const THEME_STORAGE_KEY = 'expenseTracker.theme';

// --- GLOBAL API HELPER ---
const apiFetch = (endpoint, options = {}) => {
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        }
    };
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        }
    };
    return fetch(`https://expense-tracker-5aj7.onrender.com/api${endpoint}`, mergedOptions);
};

// Global variables to hold references for edit submit functions
let currentEditTransactionSubmitHandler = null;
let currentEditCategorySubmitHandler = null;
let currentEditGoalSubmitHandler = null;
let listenersBound = false;

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
// --- THEME MANAGEMENT & CHART COLORS ---
// ----------------------------------------------------------------------

function applySavedTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const themeToggle = document.getElementById('theme-icon');
    const body = document.body;

    if (savedTheme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        if (themeToggle) {
            themeToggle.classList.remove('fa-moon');
            themeToggle.classList.add('fa-sun');
        }
    } else {
        body.removeAttribute('data-theme');
        if (themeToggle) {
            themeToggle.classList.remove('fa-sun');
            themeToggle.classList.add('fa-moon');
        }
    }
}

function toggleTheme() {
    const themeToggle = document.getElementById('theme-icon');
    const body = document.body;
    const isDark = body.getAttribute('data-theme') === 'dark';

    if (isDark) {
        body.removeAttribute('data-theme');
        localStorage.setItem(THEME_STORAGE_KEY, 'light');
        if (themeToggle) {
            themeToggle.classList.remove('fa-sun');
            themeToggle.classList.add('fa-moon');
        }
    } else {
        body.setAttribute('data-theme', 'dark');
        localStorage.setItem(THEME_STORAGE_KEY, 'dark');
        if (themeToggle) {
            themeToggle.classList.remove('fa-moon');
            themeToggle.classList.add('fa-sun');
        }
    }

    // Re-render charts so text and grid lines match the active theme
    renderCharts();
}

function getChartThemeColors() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    return {
        textColor: isDark ? '#cbd5e1' : '#475569',
        gridColor: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.2)',
        borderColor: isDark ? '#111827' : '#ffffff'
    };
}

// ----------------------------------------------------------------------
// --- AUTHENTICATION & UI CONTROL FUNCTIONS ---
// ----------------------------------------------------------------------

async function checkLoginStatus() {
    try {
        const res = await apiFetch('/user/me', { method: 'GET' });
        if (res.ok) {
            const user = await res.json();
            if (user && user.name) {
                document.querySelector('.user-profile h3').textContent = `Welcome, ${user.name.split(' ')[0]}!`;
            }
            showDashboard();
        } else {
            showLoginScreen();
        }
    } catch (err) {
        console.warn('Failed to verify login status:', err);
        showLoginScreen();
    }
}

function showLoginScreen() {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('app-dashboard');
    const body = document.body;

    if (loginContainer) loginContainer.classList.remove('hidden');
    if (dashboardContainer) dashboardContainer.classList.add('hidden');

    body.classList.add('bg-gray-50', 'flex', 'items-center', 'justify-center', 'min-h-screen');

    showLogin();
}

function showDashboard() {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('app-dashboard');
    const body = document.body;

    if (loginContainer) loginContainer.classList.add('hidden');
    if (dashboardContainer) dashboardContainer.classList.remove('hidden');

    body.classList.remove('flex', 'items-center', 'justify-center', 'min-h-screen');

    init();
}

window.logout = async function() {
    try {
        await apiFetch('/logout', { method: 'POST' });
    } catch (error) {
        console.error("Error logging out:", error);
    } finally {
        state = {
            transactions: [],
            categories: [],
            goals: [],
            currentMonth: new Date().getMonth(),
            currentYear: new Date().getFullYear()
        };
        showLoginScreen();
        displayMessage("Successfully logged out.", 'success');
    }
};

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
};

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

    const nameField = document.getElementById('name-field');
    if (nameField) nameField.remove();

    const confirmPasswordField = document.getElementById('confirm-password-field');
    if (confirmPasswordField) confirmPasswordField.remove();

    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Sign In';
    form.classList.remove('signup-form');

    if (backToLoginLink) backToLoginLink.classList.add('hidden');
    if (signUpLinkContainer) signUpLinkContainer.classList.remove('hidden');

    if (messageBox) messageBox.classList.add('hidden');
};

window.handleGoogleSignIn = function() {
    displayMessage("Simulating Google Sign-In... (Not implemented in this demo)", 'error');
    setTimeout(() => {
        document.getElementById('messageBox')?.classList.add('hidden');
    }, 3000);
};

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

function exportTransactionsToCSV() {
    if (!state.transactions || state.transactions.length === 0) {
        alert('No transactions available to export.');
        return;
    }

    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    const rows = state.transactions.map(t => [
        t.date instanceof Date ? t.date.toISOString().split('T')[0] : t.transactionDate,
        `"${String(t.description || '').replace(/"/g, '""')}"`,
        `"${String(t.category || 'Uncategorized').replace(/"/g, '""')}"`,
        t.type,
        t.amount
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ----------------------------------------------------------------------
// --- APP DATA & UI CORE FUNCTIONS ---
// ----------------------------------------------------------------------

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

function saveData() {
    console.log("saveData() is deprecated. Data is saved via API calls.");
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

    const transTypeSelect = document.getElementById('trans-type');
    if (transTypeSelect) {
        transTypeSelect.onchange = function() {
            const goalGroup = document.getElementById('goal-selection-group');
            if (this.value === 'income' || this.value === '') {
                if (goalGroup) goalGroup.style.display = 'block';
            } else {
                if (goalGroup) goalGroup.style.display = 'none';
                if (goalSelect) goalSelect.value = '';
            }
        };

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

async function handleCategorySubmit(e) {
    e.preventDefault();
    const categoryForm = document.getElementById('category-form');
    if (!categoryForm) return;

    const newCategoryData = {
        name: document.getElementById('category-name').value,
        budget: parseFloat(document.getElementById('category-budget').value),
        icon: document.getElementById('category-icon').value,
        color: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'][Math.floor(Math.random() * 7)]
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

async function handleGoalSubmit(e) {
    e.preventDefault();
    const goalForm = document.getElementById('goal-form');
    if (!goalForm) return;

    const newGoalData = {
        name: document.getElementById('goal-name').value,
        targetAmount: parseFloat(document.getElementById('goal-target').value),
        targetDate: new Date(document.getElementById('goal-date').value).toISOString().split('T')[0],
        monthlyContribution: parseFloat(document.getElementById('goal-monthly-contribution').value),
        saved: parseFloat(document.getElementById('goal-saved')?.value || 0)
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
    renderFiftyThirtyTwenty();
}

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

function renderTransactionsTable() {
    const container = document.getElementById('transactions-list');
    if (!container) return;
    container.innerHTML = '';

    const typeFilter = document.getElementById('transaction-type')?.value || 'all';
    const categoryFilter = document.getElementById('transaction-category')?.value || 'all';
    const monthFilter = document.getElementById('transaction-month')?.value || 'all';

    const categorySelect = document.getElementById('transaction-category');
    if (categorySelect) {
        const currentVal = categorySelect.value;
        categorySelect.querySelectorAll('option:not(:first-child)').forEach(option => option.remove());
        state.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
        categorySelect.value = currentVal;
    }

    const monthSelect = document.getElementById('transaction-month');
    if (monthSelect) {
        const currentMonthVal = monthSelect.value;
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
        monthSelect.value = currentMonthVal;
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
                <i class="fas ${trans.icon || 'fa-money-bill-wave'}" style="margin-right: 6px; color: var(--accent-primary);"></i>
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

function renderCategories() {
    const container = document.getElementById('budget-categories');
    if (!container) return;
    container.innerHTML = '';

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
                <div class="budget-icon" style="background-color: ${category.color || '#10b981'}">
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
                Spent: ${formatCurrency(spent)} / Remaining: ${formatCurrency(remaining)}
            </div>
            <div class="budget-progress">
                <div class="budget-progress-bar" style="width: ${percentage}%; background-color: ${category.color || '#10b981'}"></div>
            </div>
            <div class="budget-stats">
                <span>${percentage.toFixed(0)}% of budget</span>
                <span class="${remaining < 0 ? 'negative-text' : ''}">${formatCurrency(remaining)} left</span>
            </div>
        `;

        container.appendChild(categoryEl);
    });
}

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
            statusColor = '#ef4444';
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

async function editGoal(id) {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;
    const goalForm = document.getElementById('goal-form');
    if (!goalForm) return;

    openModal('goal');

    document.getElementById('goal-name').value = goal.name;
    document.getElementById('goal-target').value = goal.targetAmount;
    document.getElementById('goal-monthly-contribution').value = goal.monthlyContribution;
    document.getElementById('goal-saved').value = goal.saved;
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
            saved: parseFloat(document.getElementById('goal-saved')?.value ?? goal.saved)
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

// ----------------------------------------------------------------------
// --- CHARTS (DARK MODE AWARE) ---
// ----------------------------------------------------------------------

function renderCharts() {
    renderCategoryChart();
    renderMonthlyChart();
    renderIncomeExpenseChart();
    renderTrendsChart();
    renderTopExpenses();
    renderCategoryBreakdown();
}

function renderCategoryChart() {
    const ctx = document.getElementById('categoryChart')?.getContext('2d');
    if (!ctx) return;
    const { textColor, borderColor } = getChartThemeColors();
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
    const backgroundColors = categories.map(cat => cat.color || '#10b981');

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
                borderColor: borderColor,
                borderWidth: 2,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            aspectRatio: 1.5,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: textColor,
                        font: { family: 'Poppins', size: 12 },
                        usePointStyle: true,
                        padding: 16
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
                    color: textColor,
                    font: { family: 'Poppins', size: 13 }
                }
            }
        }
    });
}

function renderMonthlyChart() {
    const ctx = document.getElementById('monthlyChart')?.getContext('2d');
    if (!ctx) return;
    const { textColor, gridColor } = getChartThemeColors();
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
        `${getMonthName(month.month).slice(0, 3)} ${month.year.toString().slice(2)}`
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
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: '#10b981',
                    borderRadius: 6
                },
                {
                    label: 'Expenses',
                    data: expensesData,
                    backgroundColor: '#ef4444',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            return formatCurrency(value);
                        },
                        font: { family: 'Poppins', size: 11 }
                    },
                    grid: { color: gridColor }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, font: { family: 'Poppins', size: 11 } }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: textColor, font: { family: 'Poppins' }, usePointStyle: true }
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

function renderIncomeExpenseChart() {
    const ctx = document.getElementById('incomeExpenseChart')?.getContext('2d');
    if (!ctx) return;
    const { textColor, borderColor } = getChartThemeColors();
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
        type: 'doughnut',
        data: {
            labels: ['Income', 'Expenses'],
            datasets: [{
                data: [income, expenses],
                backgroundColor: ['#10b981', '#ef4444'],
                borderColor: borderColor,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: textColor, font: { family: 'Poppins' }, usePointStyle: true }
                },
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

function renderTrendsChart() {
    const ctx = document.getElementById('trendsChart')?.getContext('2d');
    if (!ctx) return;
    const { textColor, gridColor } = getChartThemeColors();
    const monthlyTrendsMap = {};

    state.transactions.forEach(trans => {
        const dateKey = `${trans.date.getFullYear()}-${trans.date.getMonth()}`;
        if (!monthlyTrendsMap[dateKey]) {
            monthlyTrendsMap[dateKey] = {
                month: trans.date.getMonth(), year: trans.date.getFullYear(), income: 0, expenses: 0, balance: 0,
                label: `${getMonthName(trans.date.getMonth()).slice(0, 3)} ${trans.date.getFullYear().toString().slice(2)}`
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
                    backgroundColor: 'rgba(16, 185, 129, 0.16)',
                    borderColor: '#10b981',
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3
                },
                {
                    label: 'Expenses',
                    data: expensesData,
                    backgroundColor: 'rgba(239, 68, 68, 0.16)',
                    borderColor: '#ef4444',
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3
                },
                {
                    label: 'Balance',
                    data: balanceData,
                    borderColor: '#3b82f6',
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: false,
                    borderDash: [5, 5],
                    pointRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            return formatCurrency(value);
                        },
                        font: { family: 'Poppins', size: 11 }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, font: { family: 'Poppins', size: 11 } }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: textColor, font: { family: 'Poppins' }, usePointStyle: true }
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
                <i class="fas ${expense.icon || 'fa-money-bill-wave'}" style="margin-right: 8px; color: var(--accent-primary);"></i>
                ${expense.description} (${expense.category || 'Uncategorized'})
            </span>
            <span class="transaction-amount expense">${formatCurrency(expense.amount)}</span>
        `;
        container.appendChild(li);
    });
}

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
                name: category?.name || 'Unknown',
                amount,
                percentage: totalExpenses > 0 ? (amount / totalExpenses * 100) : 0,
                color: category?.color || '#10b981'
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
            <span><strong>${category.percentage.toFixed(1)}%</strong> (${formatCurrency(category.amount)})</span>
        `;
        container.appendChild(li);
    });
}

function setCurrentMonthYear() {
    const monthName = getMonthName(state.currentMonth);
    const el = document.getElementById('current-month');
    if (el) el.textContent = `${monthName} ${state.currentYear}`;
}

// --- 50/30/20 monthly pocket-money planner ---
const BUDGET_INCOME_KEY = 'expenseTracker.monthlyBudgetIncome';

function getBudgetMonthlyIncome() {
    const raw = localStorage.getItem(BUDGET_INCOME_KEY);
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
}

function classifyBudgetCategory(transaction) {
    const category = String(transaction.category || transaction.categoryName || '').toLowerCase();
    const description = String(transaction.description || '').toLowerCase();
    const text = `${category} ${description}`;
    const wantsWords = /shopping|entertainment|movie|game|gaming|subscription|fun|cafe|restaurant|travel|gift|fashion|hobby|snack|coffee/.test(text);
    const needsWords = /food|grocery|house|rent|electric|bill|transport|bus|fuel|petrol|medical|health|education|college|book|internet|mobile|phone|essential/.test(text);
    if (wantsWords) return 'wants';
    if (needsWords) return 'needs';
    return 'needs';
}

function renderRuleTile(prefix, target, spent) {
    const remaining = target - spent;
    const percent = target > 0 ? Math.min(100, (spent / target) * 100) : (spent > 0 ? 100 : 0);
    const targetEl = document.getElementById(`${prefix}-target`);
    const spentEl = document.getElementById(`${prefix}-spent`);
    const leftEl = document.getElementById(`${prefix}-left`);
    const progressEl = document.getElementById(`${prefix}-progress`);
    if (targetEl) targetEl.textContent = formatCurrency(target);
    if (spentEl) spentEl.textContent = formatCurrency(spent);
    if (leftEl) {
        leftEl.textContent = formatCurrency(Math.max(0, remaining));
        leftEl.classList.toggle('over-budget', remaining < 0);
    }
    if (progressEl) {
        progressEl.style.width = `${percent}%`;
        progressEl.classList.toggle('over-budget-bar', spent > target);
    }
}

function renderFiftyThirtyTwenty() {
    const incomeInput = document.getElementById('budget-monthly-income');
    if (!incomeInput) return;
    const income = getBudgetMonthlyIncome();
    if (document.activeElement !== incomeInput) incomeInput.value = income || '';

    const now = new Date();
    const thisMonthExpenses = state.transactions.filter(t =>
        t.type === 'expense' && t.date instanceof Date &&
        t.date.getMonth() === now.getMonth() && t.date.getFullYear() === now.getFullYear()
    );
    const needsSpent = thisMonthExpenses.filter(t => classifyBudgetCategory(t) === 'needs').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const wantsSpent = thisMonthExpenses.filter(t => classifyBudgetCategory(t) === 'wants').reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const saved = state.transactions.filter(t =>
        t.type === 'income' && t.goalId != null && t.date instanceof Date &&
        t.date.getMonth() === now.getMonth() && t.date.getFullYear() === now.getFullYear()
    ).reduce((sum, t) => sum + Number(t.amount || 0), 0);

    renderRuleTile('needs', income * 0.5, needsSpent);
    renderRuleTile('wants', income * 0.3, wantsSpent);
    const savingsTarget = income * 0.2;
    const savingsTargetEl = document.getElementById('savings-target');
    const savedEl = document.getElementById('savings-saved');
    const leftEl = document.getElementById('savings-left');
    const progressEl = document.getElementById('savings-progress');
    if (savingsTargetEl) savingsTargetEl.textContent = formatCurrency(savingsTarget);
    if (savedEl) savedEl.textContent = formatCurrency(saved);
    if (leftEl) leftEl.textContent = formatCurrency(Math.max(0, savingsTarget - saved));
    if (progressEl) {
        progressEl.style.width = `${savingsTarget > 0 ? Math.min(100, saved / savingsTarget * 100) : 0}%`;
        progressEl.classList.toggle('over-budget-bar', saved > savingsTarget);
    }
}

function setupBudgetPlanner() {
    const saveButton = document.getElementById('save-budget-income');
    const incomeInput = document.getElementById('budget-monthly-income');
    if (!saveButton || saveButton.dataset.bound === 'true') return;
    saveButton.dataset.bound = 'true';
    incomeInput.value = getBudgetMonthlyIncome() || '';
    const saveIncome = () => {
        const income = Number(incomeInput.value);
        if (!Number.isFinite(income) || income <= 0) {
            alert('Enter a monthly income greater than ₹0 to set your budget.');
            incomeInput.focus();
            return;
        }
        localStorage.setItem(BUDGET_INCOME_KEY, String(income));
        renderFiftyThirtyTwenty();
    };
    saveButton.addEventListener('click', saveIncome);
    incomeInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') { event.preventDefault(); saveIncome(); }
    });
}

function handleTransactionAction(e) {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (editBtn) editTransaction(parseInt(editBtn.dataset.id));
    if (deleteBtn) deleteTransaction(parseInt(deleteBtn.dataset.id));
}

function handleCategoryAction(e) {
    const editBtn = e.target.closest('.edit-category-btn');
    const deleteBtn = e.target.closest('.delete-category-btn');

    if (editBtn) editCategory(parseInt(editBtn.dataset.id));
    if (deleteBtn) deleteCategory(parseInt(deleteBtn.dataset.id));
}

function handleGoalAction(e) {
    const editBtn = e.target.closest('.edit-goal-btn');
    const deleteBtn = e.target.closest('.delete-goal-btn');

    if (editBtn) editGoal(parseInt(editBtn.dataset.id));
    if (deleteBtn) deleteGoal(parseInt(deleteBtn.dataset.id));
}

function setupEventListeners() {
    if (listenersBound) return;
    listenersBound = true;

    const navItems = document.querySelectorAll('.main-nav li');
    const contentSections = document.querySelectorAll('.content-section');
    const transactionsListContainer = document.getElementById('transactions-list');
    const budgetCategoriesContainer = document.getElementById('budget-categories');
    const goalsContainer = document.getElementById('savings-goals');

    const themeBtn = document.getElementById('theme-toggle-btn') || document.querySelector('.theme-toggle');
    themeBtn?.addEventListener('click', toggleTheme);

    document.getElementById('export-data')?.addEventListener('click', exportTransactionsToCSV);

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const section = item.getAttribute('data-section');
            contentSections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(section).classList.add('active');

            if (section === 'transactions') renderTransactionsTable();
            else if (section === 'budgets') renderCategories();
            else if (section === 'reports') renderCharts();
            else if (section === 'goals') renderGoals();
        });
    });

    document.getElementById('add-transaction')?.addEventListener('click', () => openModal('transaction'));
    document.getElementById('add-category')?.addEventListener('click', () => openModal('category'));
    document.getElementById('add-goal')?.addEventListener('click', () => openModal('goal'));
    document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', closeModal));
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) closeModal();
    });

    transactionsListContainer?.addEventListener('click', handleTransactionAction);
    budgetCategoriesContainer?.addEventListener('click', handleCategoryAction);
    goalsContainer?.addEventListener('click', handleGoalAction);

    document.getElementById('prev-month')?.addEventListener('click', () => {
        if (state.currentMonth === 0) { state.currentMonth = 11; state.currentYear--; }
        else { state.currentMonth--; }
        setCurrentMonthYear();
        renderCharts();
    });

    document.getElementById('next-month')?.addEventListener('click', () => {
        if (state.currentMonth === 11) { state.currentMonth = 0; state.currentYear++; }
        else { state.currentMonth++; }
        setCurrentMonthYear();
        renderCharts();
    });

    document.getElementById('transaction-type')?.addEventListener('change', renderTransactionsTable);
    document.getElementById('transaction-category')?.addEventListener('change', renderTransactionsTable);
    document.getElementById('transaction-month')?.addEventListener('change', renderTransactionsTable);
}

async function init() {
    await loadData();
    setupEventListeners();
    setupBudgetPlanner();

    renderCategories();
    setCurrentMonthYear();

    updateSummaryCards();
    renderRecentTransactions();
    renderCharts();
    renderGoals();
    renderFiftyThirtyTwenty();
}

// --- DOMContentLoaded for initial setup and Login/Signup form handling ---
document.addEventListener('DOMContentLoaded', function() {
    applySavedTheme();

    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    checkLoginStatus();

    if (form && !form.__submitHandlerAttached) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value.trim() : '';
            const apiBaseUrl = 'https://expense-tracker-5aj7.onrender.com/api';

            if (email === '' || password === '') {
                displayMessage("Please enter both email and password.", 'error');
                return;
            }

            if (form.classList.contains('signup-form')) {
                const nameInput = document.getElementById('name');
                const name = nameInput ? nameInput.value.trim() : 'User';
                const confirmPasswordInput = document.getElementById('confirm-password');
                const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

                if (password !== confirmPassword) {
                    displayMessage('Passwords do not match.', 'error');
                    return;
                }

                try {
                    const response = await fetch(`${apiBaseUrl}/register`, {
                        method: 'POST',
                        credentials: 'include',
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
                const formData = new URLSearchParams();
                formData.append('username', email);
                formData.append('password', password);

                try {
                    const response = await fetch(`${apiBaseUrl}/login`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: formData.toString()
                    });

                    if (response.ok) {
                        displayMessage("Sign In Successful! Loading dashboard...", 'success');

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
                                    displayMessage('Sign in succeeded but session not established. Please ensure cookies are enabled and server allows credentials.', 'error');
                                }
                            } catch (err) {
                                console.error('Failed to verify session after login:', err);
                                displayMessage('Sign in succeeded but session verification failed.', 'error');
                            }
                        }, 300);
                    } else {
                        displayMessage('Invalid email or password.', 'error');
                    }
                } catch (error) {
                    console.error('Login request failed:', error);
                    displayMessage('Cannot connect to the server. Check the browser console for details.', 'error');
                }
            }
        });

        form.__submitHandlerAttached = true;
    }
});