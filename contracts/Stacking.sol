// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

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
		bool isTaken;
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
	uint256 constant public PENALTY_PERCENT = 300;

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

		plans.push(Plan(3 * 30, 1000));
		plans.push(Plan(6 * 30, 1500));
        plans.push(Plan(9 * 30, 2000));
    }

    function deposit(uint8 plan, uint256 amounts) public nonReentrant {
		require(amounts >= MIN_AMOUNT, "min limit 0.001 is required");
        require(plan < plans.length, "Invalid plan");
        token.transferFrom(msg.sender, address(this), amounts);

		User storage user = users[msg.sender];

		if (user.deposits.length == 0) {
			user.checkpoint = block.timestamp;
			emit Newbie(msg.sender);
		}

		users[msg.sender].deposits.push(Deposit(plan, amounts, block.timestamp, false));
		totalStacked = totalStacked.add(amounts);
		emit NewDeposit(msg.sender, plan, amounts);
    }

	function withdraw(uint256 depositId) public nonReentrant {
		uint256 dividens = getUserDividends(msg.sender, depositId);

		User storage user = users[msg.sender];
		Deposit storage _deposit = user.deposits[depositId];
		require(_deposit.isTaken == false, 'deposit is already taken');

		uint256 totalAmount;
		uint256 finish = _deposit.start.add(plans[_deposit.plan].time.mul(TIME_STEP));
		if (finish > block.timestamp) {
			totalAmount = _deposit.amount.sub(_deposit.amount.mul(PENALTY_PERCENT).div(PERCENT_DIVIDER));
			adminTokens = adminTokens.add(_deposit.amount.sub(totalAmount));
		} else {
			totalAmount = _deposit.amount.add(dividens);
			user.seedIncome = user.seedIncome.add(dividens);
		}

		require(getContractBalance() >= totalAmount, "Tokens are not available, please contact admin");

		user.checkpoint = block.timestamp;
		user.withdrawn = user.withdrawn.add(totalAmount);
        token.transfer(msg.sender, totalAmount);
		_deposit.isTaken = true;

		emit Withdrawn(msg.sender, totalAmount);
	}

	function addTokens(uint256 amounts) public onlyOwner {
        token.transferFrom(msg.sender, address(this), amounts);
		adminTokens = adminTokens.add(amounts);
	}

	function withdrawTokens(uint256 amounts) public onlyOwner {
		require(adminTokens >= amounts, 'Admin can withdraw less than adminTokens amount');
		token.transfer(msg.sender, amounts);
		adminTokens = adminTokens.sub(amounts);
	}

    function getUserDividends(address userAddress, uint256 depositId) public view returns (uint256) {
		require(depositId < getUserAmountOfDeposits(userAddress), 'Invalid depositId');

		User storage user = users[userAddress];
		Deposit storage _deposit = user.deposits[depositId];

		uint256 finish = _deposit.start.add(plans[_deposit.plan].time.mul(TIME_STEP));
		uint256 share = _deposit.amount.mul(plans[_deposit.plan].percent).div(PERCENT_DIVIDER);
		uint256 to = block.timestamp > finish ? finish : block.timestamp;
		uint256 from = _deposit.start;

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

	function getUserDepositInfo(address userAddress, uint256 depositId) public view returns (uint8 plan, uint256 percent, uint256 amount, uint256 start, uint256 finish, bool isTaken) {
	    User storage user = users[userAddress];
		Deposit storage _deposit = user.deposits[depositId];

		plan = _deposit.plan;
		percent = plans[plan].percent;
		amount = _deposit.amount;
		start = _deposit.start;
		finish = _deposit.start.add(plans[_deposit.plan].time.mul(TIME_STEP));
		isTaken = _deposit.isTaken;
	}
}
