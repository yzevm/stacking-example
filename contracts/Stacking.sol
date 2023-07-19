// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Stacking is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    struct Plan {
        uint256 time;
        uint256 percent;
    }

    struct Deposit {
        uint8 plan;
		uint256 amount;
		uint256 start;
	}

	struct User {
		Deposit[] deposits;
		uint256 checkpoint;
		uint256 seedIncome;
		uint256 withdrawn;
	}

	uint256 constant public MIN_AMOUNT = 1e15; // 0.001 token
	uint256 constant public PERCENT_DIVIDER = 10000;
	uint256 constant public TIME_STEP = 1 days;
	uint256 constant public ONE_YEAR = 365 * TIME_STEP;

	mapping (address => User) public users;
    Plan[] public plans;
    IERC20 public token;
	uint256 public totalStacked;
	uint256 public adminTokens;
	uint256[] public usersDeposits;

	event Newbie(address user);
	event NewDeposit(address indexed user, uint8 plan, uint256 amount);
	event Withdrawn(address indexed user, uint256 amount);

    constructor(address _tokenAddress) payable {
        token = IERC20(_tokenAddress);

		plans.push(Plan(30, 1000));
		plans.push(Plan(60, 1500));
        plans.push(Plan(90, 2000));
    }

    function depositTokens(uint8 plan, uint256 amounts) public nonReentrant {
		require(amounts >= MIN_AMOUNT, "min limit 0.001 is required");
        require(plan < 3, "Invalid plan");
        token.transferFrom(msg.sender, address(this), amounts);

		User storage user = users[msg.sender];

		if (user.deposits.length == 0) {
			user.checkpoint = block.timestamp;
			emit Newbie(msg.sender);
		}

		users[msg.sender].deposits.push(Deposit(plan, amounts, block.timestamp));
		totalStacked = totalStacked.add(amounts);
		emit NewDeposit(msg.sender, plan, amounts);
    }

	function withdraw(uint256 depositId) public nonReentrant {
		uint256 dividens = getUserDividends(msg.sender, depositId);

		User storage user = users[msg.sender];
		Deposit storage deposit = user.deposits[depositId];

		uint256 totalAmount = deposit.amount.add(dividens);
		require(getContractBalance() >= totalAmount, "Tokens are not available, please contact admin");

		user.checkpoint = block.timestamp;
		user.withdrawn = user.withdrawn.add(totalAmount);
        token.transfer(msg.sender, totalAmount);

		emit Withdrawn(msg.sender, totalAmount);
	}

	function addTokens(uint256 amounts) public onlyOwner() {
        token.transferFrom(msg.sender, address(this), amounts);
		adminTokens = adminTokens.add(amounts);
	}

	function withdrawTokens(uint256 amounts) public onlyOwner() {
		require(adminTokens >= amounts, 'Admin can withdraw less than adminTokens amount');
		token.transfer(msg.sender, amounts);
		adminTokens = adminTokens.sub(amounts);
	}

    function getUserDividends(address userAddress, uint256 depositId) public view returns (uint256) {
		require(depositId < getUserAmountOfDeposits(userAddress), 'Invalid depositId');

		User storage user = users[userAddress];
		Deposit storage deposit = user.deposits[depositId];

		uint256 finish = deposit.start.add(plans[deposit.plan].time.mul(TIME_STEP));
		uint256 share = deposit.amount.mul(plans[deposit.plan].percent).div(PERCENT_DIVIDER);
		uint256 to = block.timestamp > finish ? finish : block.timestamp;
		uint256 from = deposit.start;

		return share.mul(to.sub(from)).div(ONE_YEAR);
	}

    function getContractBalance() public view returns (uint256) {
		return token.balanceOf(address(this));
	}

	function getPlanInfo(uint8 plan) public view returns(uint256 time, uint256 percent) {
		time = plans[plan].time;
		percent = plans[plan].percent;
	}

	function getUserAmountOfDeposits(address userAddress) public view returns(uint256) {
		return users[userAddress].deposits.length;
	}

	function getUserTotalDeposits(address userAddress) public view returns(uint256 amount) {
		for (uint256 i = 0; i < users[userAddress].deposits.length; i++) {
			amount = amount.add(users[userAddress].deposits[i].amount);
		}
	}

	function getUserDepositInfo(address userAddress, uint256 depositId) public view returns(uint8 plan, uint256 percent, uint256 amount, uint256 start, uint256 finish) {
	    User storage user = users[userAddress];
		Deposit storage deposit = user.deposits[depositId];

		plan = deposit.plan;
		percent = plans[plan].percent;
		amount = deposit.amount;
		start = deposit.start;
		finish = deposit.start.add(plans[deposit.plan].time.mul(TIME_STEP));
	}
}
