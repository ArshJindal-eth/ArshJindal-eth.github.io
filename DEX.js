// connect to Moralis server
  
const serverUrl = 'https://sywz2ydsp7ot.usemoralis.com:2053/server';
const appId = 'G3jWb50YHH1rqGdvFpI9U6dF0rSLtckYc7qkWtqq';
Moralis.start({ serverUrl, appId });

Moralis
    .initPlugins()
    .then(() => console.log('plugin initialized'))


const $tokenBalanceTBody = document.querySelector('.js-token-balances');
const $slectedToken = document.querySelector(".js-from-token");
const $amountInput = document.querySelector(".js-from-amount")

//utilities

const tokenValue = (value, decimals) =>
    (decimals ? value / Math.pow(10, decimals) : value);


// login logout    & initialiazation
async function login(event) {
    let user = Moralis.User.current();
    if (!user) {
      user = await Moralis.authenticate();
    }
    console.log("logged in user:", user);

    getStats();
}


async function initSwapForm (event) {
    event.preventDefault();
    $slectedToken.innerHTML= event.target.dataset.symbol;
    $slectedToken.dataset.address = event.target.dataset.address;
    $slectedToken.dataset.decimals = event.target.dataset.decimals;
    $slectedToken.dataset.max = event.target.dataset.max;
    $amountInput.removeAttribute('disabled');
    $amountInput.value = '';
    document.querySelector('.js-submit').removeAttribute('disabled');
    document.querySelector('.js-cancel').removeAttribute('disabled');
    document.querySelector('.js-quote-container').innerHTML= '';    

}

async function getStats() {
    const balances = await Moralis.Web3API.account.getTokenBalances({chain: "polygon"});
    console.log(balances)
    $tokenBalanceTBody.innerHTML = balances.map( (token, index) => `
        <tr>
                <td>${index + 1}</td>
                <td>${token.symbol}</td>
                <td>${tokenValue(token.balance, token.decimals)}</td>
                <td>
                    <button
                        class ="js-swap"
                        data-address ="${token.token_address}"
                        data-symbol = "${token.symbol}"
                        data-decimals ="${token.decimals}"
                        data-max="${tokenValue(token.balance, token.decimals)}"
                    >
                        Swap
                    </button>
                </td>

        </tr>
    `).join('');

    for(let $btn of $tokenBalanceTBody.querySelectorAll(".js-swap")){
        $btn.addEventListener('click', initSwapForm)
    }
}

async function logOut() {
    await Moralis.User.logOut();
    console.log("logged out");
}

async function buyCrypto (){
    Moralis.Plugins.fiat.buy()
}
 

  document.getElementById("btn-login").onclick = login;
  document.getElementById("btn-logout").onclick = logOut;
  document.getElementById("btn-buy-crypto").addEventListener('click', buyCrypto); 

// quote /swap


async function formSubmitted(event){
    event.preventDefault();
    const fromAmount = Number.parseFloat($amountInput.value);
    const fromMaxValue = Number.parseFloat($slectedToken.dataset.max);
    if(Number.isNaN(fromAmount) || fromAmount>fromMaxValue) {
        document.querySelector(".js-amount-error").innerText = 'invalid amount';
    }else{
        document.querySelector(".js-amount-error").innerText = ' ';
    }


    const [toTokenAddress, toDecimals] = document.querySelector('[name=to-token]').value.split('-');
    const fromDecimals = $slectedToken.dataset.decimals;
    const fromTokenAddress = $slectedToken.dataset.address;
    try{
        //async function getQuote() {
            const quote = await Moralis.Plugins.oneInch.quote({
              chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
              fromTokenAddress, // The token you want to swap
              toTokenAddress, // The token you want to receive
              amount: Moralis.Units.Token(fromAmount, fromDecimals),
            });
            
            const toAmount = tokenValue(quote.toTokenAmount, toDecimals);
            document.querySelector('.js-quote-container').innerHTML=`
                <p>${fromAmount} ${quote.fromToken.symbol} = ${toAmount} ${quote.toToken.symbol}</p>
                <p> gas fee : ${quote.estimatedGas} </p>
                <button class="btn btn-success" id="btn-ps">perform swap</button>
            `;
            

            async function swap(event) {
                event.preventDefault();
                const [toTokenAddress, toDecimals] = document.querySelector('[name=to-token]').value.split('-');
                const fromDecimals = $slectedToken.dataset.decimals;
                const fromTokenAddress = $slectedToken.dataset.address;
                const fromAmount = Number.parseFloat($amountInput.value);
                const receipt = await Moralis.Plugins.oneInch.swap({
                  chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
                  fromTokenAddress: fromTokenAddress, // The token you want to swap
                  toTokenAddress: toTokenAddress, // The token you want to receive
                  amount: Moralis.Units.Token(fromAmount, fromDecimals),
                  fromAddress: Moralis.User.current().get('ethAddress'), // Your wallet address
                  slippage: 1,
                });
                console.log(receipt);
              } 


              document.getElementById("btn-ps").addEventListener('click', swap );

          //}
    }catch(error){
        document.querySelector('.js-quote-container').innerHTML=`
            <p class='error'>The conversion didnt succeed.</p>
        `;
    }
}








async function formCancelled(event){
    event.preventDefault();
  
    $amountInput.setAttribute('disabled', " " );
    $amountInput.value = '';
    document.querySelector('.js-submit').setAttribute('disabled', " ");
    document.querySelector('.js-cancel').setAttribute('disabled', " ");
    document.querySelector('.js-quote-container').innerHTML= '';
    delete $slectedToken.dataset.address;
    delete $slectedToken.dataset.decimals; 
    delete $slectedToken.dataset.max;    
    document.querySelector(".js-amount-error").innerText = ' ';
}


document.querySelector(".js-submit").addEventListener('click',formSubmitted);
document.querySelector(".js-cancel").addEventListener('click',formCancelled);







//to token dropdown preparation
async function getTop10Token() {
    const response = await fetch('https://api.coinpaprika.com/v1/coins');
    const tokens = await response.json();

    return tokens
            .filter(token => token.rank >= 1 && token.rank <= 50)
            .map(token => token.symbol);
}

async function getSupportedTokens() {
    const tokens = await Moralis.Plugins.oneInch.getSupportedTokens({
      chain: 'bsc', // The blockchain you want to use (eth/bsc/polygon)
    });
    console.log(tokens);
  }



async function getTickerData(tickerList){
    const response = await fetch('https://api.1inch.exchange/v4.0/137/tokens');
    const tokens = await response.json();
    const tokenList = Object.values(tokens.tokens)
    return tokenList.filter(token => tickerList.includes(token.symbol));
             
}

function renderTokenDropdown (tokens){
    const options = tokens.map(token => 
            `<option value = "${token.address}-${token.decimals}">
                    ${token.name}
            </option>`);
            document.querySelector('[name = to-token]').innerHTML=options
}

getTop10Token()
        .then(getTickerData)
        .then(renderTokenDropdown);
