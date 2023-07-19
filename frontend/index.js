/*** SET THESE VARIABLES ***/
const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Update with the address of your smart contract

/*** Global scope variables that will be automatically assigned values later on ***/
let infoSpace; // This is an <ul> element where we will print out all the info
let web3; // Web3 instance
let contract; // Contract instance
let account; // Your account as will be reported by Metamask

/*** Initialize when page loads ***/
window.addEventListener("load", () => {
  // Shortcut to interact with HTML elements
  infoSpace = document.querySelector(".info");

  // Check whether ethereum is defined, ie. MetaMask plugin is active
  document.querySelector(".start").addEventListener("click", async () => {
    if (contractAddress === "") {
      printResult(
        `Make sure to set the variables <code>contractAddress</code> and <code>contractAbi</code> in <code>./index.js</code> first. Check out <code>README.md</code> for more info.`
      );
      return;
    }

    // if (typeof ethereum === "undefined") {
    //   printResult(
    //     `Metamask not connected. Make sure you have the Metamask plugin, you are logged in to your MetaMask account, and you are using a server or a localhost (simply opening the html in a browser won't work).`
    //   );
    //   return;
    // }

    // Create a Web3 instance
    web3 = new Web3('http://localhost:8545')

    // Calling desired functions
    await connectWallet();
    await connectContract(contractAddress);
    await getDepositInfo(account)
  });
});

/*** Functions ***/

// Helper function to print results
const printResult = (text) => {
  infoSpace.innerHTML += `<li>${text}</li>`;
};

// Helper function to display readable address
const readableAddress = (address) => {
  return `${address.slice(0, 5)}...${address.slice(address.length - 4)}`;
};


// Connect to the MetaMast wallet
const connectWallet = async () => {
  const accounts = await web3.eth.getAccounts();
  account = accounts[0];
  printResult(`Connected account: ${readableAddress(account)}`);
};

// Connect to the contract
const connectContract = (contractAddress) => {
  const contractABI = '[ { "inputs": [ { "internalType": "address", "name": "_tokenAddress", "type": "address" } ], "stateMutability": "payable", "type": "constructor" }, { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint8", "name": "plan", "type": "uint8" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" } ], "name": "NewDeposit", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": false, "internalType": "address", "name": "user", "type": "address" } ], "name": "Newbie", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" } ], "name": "OwnershipTransferred", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" } ], "name": "Withdrawn", "type": "event" }, { "inputs": [], "name": "MIN_AMOUNT", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "ONE_YEAR", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "PERCENT_DIVIDER", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "TIME_STEP", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "uint256", "name": "amounts", "type": "uint256" } ], "name": "addTokens", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "adminTokens", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "uint8", "name": "plan", "type": "uint8" }, { "internalType": "uint256", "name": "amounts", "type": "uint256" } ], "name": "depositTokens", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "getContractBalance", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "uint8", "name": "plan", "type": "uint8" } ], "name": "getPlanInfo", "outputs": [ { "internalType": "uint256", "name": "time", "type": "uint256" }, { "internalType": "uint256", "name": "percent", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "userAddress", "type": "address" } ], "name": "getUserAmountOfDeposits", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "userAddress", "type": "address" }, { "internalType": "uint256", "name": "depositId", "type": "uint256" } ], "name": "getUserDepositInfo", "outputs": [ { "internalType": "uint8", "name": "plan", "type": "uint8" }, { "internalType": "uint256", "name": "percent", "type": "uint256" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "uint256", "name": "start", "type": "uint256" }, { "internalType": "uint256", "name": "finish", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "userAddress", "type": "address" }, { "internalType": "uint256", "name": "depositId", "type": "uint256" } ], "name": "getUserDividends", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "userAddress", "type": "address" } ], "name": "getUserTotalDeposits", "outputs": [ { "internalType": "uint256", "name": "amount", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "owner", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "name": "plans", "outputs": [ { "internalType": "uint256", "name": "time", "type": "uint256" }, { "internalType": "uint256", "name": "percent", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "token", "outputs": [ { "internalType": "contract IERC20", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "totalStacked", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "newOwner", "type": "address" } ], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "", "type": "address" } ], "name": "users", "outputs": [ { "internalType": "uint256", "name": "checkpoint", "type": "uint256" }, { "internalType": "uint256", "name": "seedIncome", "type": "uint256" }, { "internalType": "uint256", "name": "withdrawn", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "name": "usersDeposits", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "uint256", "name": "depositId", "type": "uint256" } ], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "uint256", "name": "amounts", "type": "uint256" } ], "name": "withdrawTokens", "outputs": [], "stateMutability": "nonpayable", "type": "function" } ]';
  contract = new web3.eth.Contract(JSON.parse(contractABI), contractAddress);
};

// Example of using call() on a contract's method that doesn't require gas
const getDepositInfo = async (account) => {
  printResult(`totalStacked() called.`);
  try {
    const totalStacked = await contract.methods.getContractBalance().call();
    printResult(`totalStacked ${totalStacked}`);
  } catch (error) {
    printResult(`Error: ${error.message}`);
  }
};
