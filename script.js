'use strict';

const urlLending = 'https://lending-service-d11ff0ebb68a.herokuapp.com';
const loginPath = '/api/v1/login';
const loanPath = '/api/v1/loan';
const urlGetLoaner = '/api/v1/account?name=';
const updateLoanPath = '/api/v1/loan/status';

const account = {
  owner: 'Daniel Panggabean',
  movements: [],
  movementsDetail: [],
  id: '',
  token: '',
};

const labelWelcome = document.querySelector('.welcome');
const labelDate = document.querySelector('.date');
const labelBalance = document.querySelector('.balance__value');
const labelSumIn = document.querySelector('.summary__value--in');
const labelSumOut = document.querySelector('.summary__value--out');
const labelTimer = document.querySelector('.timer');

const containerApp = document.querySelector('.app');
const containerMovements = document.querySelector('.movements');

const btnLogin = document.querySelector('.login__btn');
//
const btnTransfer = document.querySelector('.transfer__button');
//
const btnClose = document.querySelector('.form__btn--close');
// const btnSort = document.querySelector('.btn--sort');

const inputLoginUsername = document.querySelector('.login__input--user');
const inputLoginPin = document.querySelector('.login__input--pin');

//
const inputTransferAmount = document.querySelector('.transfer__input--amount');
const inputTransferMessage = document.querySelector(
  '.transfer__input--message'
);
const inputTransferLender = document.querySelector('.transfer__input--lender');
//

const inputCloseUsername = document.querySelector('.form__input--user');
const inputClosePin = document.querySelector('.form__input--pin');

const trimString = str => str.substr(0, 12);
const movHutang = arr => arr.isDebt && arr.status !== 'paid';
const payedHutang = arr => arr.isDebt && arr.status === 'paid';

const getJSON = function (url, method, body, authToken) {
  const options = {
    method,
  };

  if (authToken) {
    options.headers = { Authorization: `Bearer ${authToken}` };
  }

  if (body) {
    options.body = body;
    // Inisiatif I - Stringify disini aja
  }

  return fetch(url, options).then(res => {
    if (!res.ok) throw new Error(`Fail to fetch (${res.status})`);
    return res.json();
  });
};

const startLogOutTimer = () => {
  const tick = () => {
    const min = String(Math.trunc(time / 60)).padStart(2, 0);
    const sec = String(time % 60).padStart(2, 0);

    labelTimer.textContent = `${min}:${sec}`;

    //when 0 second handle
    if (time === 0) {
      clearInterval(timer);
      labelWelcome.textContent = 'Log in to get started';
      containerApp.style.opacity = 0;
    }

    time--;
  };
  let time = 300;

  tick();
  const timer = setInterval(tick, 1000);
  return timer;
};

const displayMovements = (accountMovement, sort = false) => {
  containerMovements.innerHTML = '';
  const movs = sort
    ? accountMovement.slice().sort((a, b) => a - b)
    : accountMovement;
  // Inisiatif II - Add feature sort

  movs.forEach((val, index) => {
    const movementType = val.isDebt ? 'hutang' : 'piutang';
    const date = new Date(val.date);
    const [month, day, year] = [
      date.getMonth(),
      date.getDate(),
      date.getFullYear(),
    ];
    const showButton = movHutang(val);
    const html = `
    <div class="movements__row">
      <div class="movements__type movements__type--${movementType}">
        ${index} ${movementType}
      </div>
      <div class="movements__date">${day}/${month}/${year}</div>
      <div class="movements__description">${trimString(
        val.description
      )}-${trimString(val.userTarget)}</div>
      <div class="movements__value">${val.amount}</div>
      ${
        showButton
          ? `<button class="movements__mark" data-value=${val.idLoan}>Lunas</button>`
          : ''
      }
    </div>`;
    // Inisiatif III - Update logic display button disini
    // Inisiatif IV - Add loading indicator

    containerMovements.insertAdjacentHTML('afterbegin', html);
  });
};

const calcDisplayBalance = acc => {
  const arrHutang = acc.movements.filter(movHutang).map(val => val.amount);
  acc.amount = arrHutang.reduce((acc, cur) => acc + cur, 0);
  labelBalance.textContent = `Rp ${acc.amount}`;
};

const calcDisplaySummary = account => {
  const income = account.movements
    .filter(payedHutang)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const outcome = account.movements
    .filter(val => !val.isDebt)
    .reduce((acc, curr) => acc + curr.amount, 0);

  labelSumIn.textContent = `Rp ${income}`;
  labelSumOut.textContent = `Rp ${outcome}`;
};

const updateUI = acc => {
  displayMovements(acc.movements);
  calcDisplayBalance(acc);
  calcDisplaySummary(acc);
};

let timer, loanerID;

const handleSuccessGetLoan = () => {
  inputLoginPin.blur();
  labelWelcome.textContent = `Welcome back, ${account.owner} !`;
  containerApp.style.opacity = 100;

  if (timer) clearInterval(timer);
  timer = startLogOutTimer();

  updateUI(account);
};

const getData = async () => {
  try {
    const data = await getJSON(
      `${urlLending}${loanPath}`,
      'GET',
      null,
      account.token
    );

    if (data) {
      // Inisiatif V - Update to forEach
      account.movements = [];
      for (let i = 0; i < data.length; i++) {
        const {
          lender,
          amount,
          description,
          created_at: date,
          borrower,
          borrower_name: borrowerName,
          lender_name: lenderName,
          status,
          id: idLoan,
        } = data[i];

        const isDebt = !(borrower === account.id);
        account.movements.push({
          amount,
          description,
          date,
          isDebt,
          lender,
          userTarget: isDebt ? borrowerName : lenderName,
          status,
          idLoan,
        });
      }
    }
    handleSuccessGetLoan();
  } catch (err) {
    alert(`Fail to fetch, ${err}`);
    // Inisitatif VI - Catch error di generic
  }
};

const loginFn = async e => {
  e.preventDefault();

  const body = {
    username: inputLoginUsername.value,
    password: inputLoginPin.value,
  };

  try {
    const data = await getJSON(
      `${urlLending}${loginPath}`,
      'POST',
      JSON.stringify(body)
    );

    inputLoginUsername.value = inputLoginPin.value = '';

    const { name: owner, token, id } = data;
    account.token = token;
    account.id = id;
    account.owner = owner;

    getData();
  } catch (err) {
    alert(`Try again, error: ${err}`);
  }
};

btnLogin.addEventListener('click', loginFn);

const transferFn = e => {
  e.preventDefault();
  const body = {
    borrower: loanerID,
    description: inputTransferMessage.value,
    amount: Number(inputTransferAmount.value),
  };

  getJSON(
    `${urlLending}${loanPath}`,
    'POST',
    JSON.stringify(body),
    account.token
  )
    .then(() => getData())
    .catch(err => alert(`Fail to fetch ${err.message}`))
    .finally(() => {
      clearInterval(timer);
      timer = startLogOutTimer();

      inputTransferAmount.value =
        inputTransferMessage.value =
        inputElement.value =
        loanerID =
          '';
    });
};

btnTransfer.addEventListener('click', transferFn);

// const closeFn = e => {
//   e.preventDefault();
//   const inputClosePinNumber = Number(inputClosePin.value);
//   if (
//     inputCloseUsername.value === currentAccount.username &&
//     inputClosePinNumber === currentAccount.pin
//   ) {
//     inputCloseUsername.value = inputClosePin.value = '';
//     containerApp.style.opacity = 0;
//   }
// };
// Inisiatif VII - Add close account feature

// btnClose.addEventListener('click', closeFn);

let sorted = false;

// btnSort.addEventListener('click', () => {
//   displayMovements(account.movements, !sorted);
//   sorted = !sorted;
// });
// Inisiatif VI - Add sort feature

function debounce(func, delay) {
  let timeoutId;
  return function () {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, arguments), delay);
  };
}

const inputElement = document.getElementById('searchInput');
const dropdownElement = document.getElementById('dropdown');

const handleInput = debounce(async function () {
  const query = inputElement.value.toLowerCase();
  const suggestions = await getSuggestions(query);
  renderSuggestions(suggestions);
}, 1000);

inputElement.addEventListener('input', handleInput);

dropdownElement.addEventListener('click', function (event) {
  const selectedValue = event.target.textContent;
  inputElement.value = selectedValue;
  loanerID = event.target.value;
  dropdownElement.style.display = 'none';
});

async function getSuggestions(query) {
  try {
    const lenders = await getJSON(
      `${urlLending}${urlGetLoaner}${query}`,
      'GET',
      null,
      account.token
    );
    return lenders;
  } catch (err) {
    alert(`Fail to fetch, ${err.message}`);
  }
}

function renderSuggestions(suggestions) {
  dropdownElement.innerHTML = '';

  if (suggestions.length > 0) {
    suggestions.forEach(suggestion => {
      const suggestionElement = document.createElement('li');
      suggestionElement.textContent = suggestion.name;
      suggestionElement.value = suggestion.id;
      dropdownElement.appendChild(suggestionElement);
    });

    dropdownElement.style.display = 'block';
  } else {
    dropdownElement.style.display = 'none';
  }
}

containerMovements.addEventListener('click', async function (e) {
  if (e.target.className === 'movements__mark') {
    const id = parseInt(e.target.dataset.value);
    const body = {
      id,
      status: 'paid',
    };
    try {
      getJSON(
        `${urlLending}${updateLoanPath}`,
        'PUT',
        JSON.stringify(body),
        account.token
      )
        .then(() => {
          getData();
          clearInterval(timer);
          timer = startLogOutTimer();
        })
        .catch(err => alert(`Fail to update status, error: ${err.message}`));
    } catch (err) {
      alert(`Fail to update status, error: ${err.message}`);
    }
  }
});
