// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMintableCollateral is IERC20 {
    function mint(address to, uint256 amount) external;
}

contract TradingVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IMintableCollateral;

    enum TradeStatus {
        Open,
        Closed
    }

    struct Bot {
        string name;
        string style;
        bool enabled;
    }

    struct Trade {
        uint256 id;
        address user;
        uint8 botId;
        string symbol;
        bool isLong;
        uint256 collateral;
        uint256 entryPrice;
        uint256 exitPrice;
        int256 pnl;
        uint64 openedAt;
        uint64 closedAt;
        TradeStatus status;
    }

    IMintableCollateral public immutable collateralToken;
    address public tradeRecorder;
    uint256 public nextTradeId = 1;

    mapping(uint8 => Bot) public bots;
    mapping(address => uint256) public availableBalance;
    mapping(address => mapping(uint8 => uint256)) public botAllocation;
    mapping(uint256 => Trade) public trades;
    mapping(address => uint256[]) private userTradeIds;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event BotAllocated(address indexed user, uint8 indexed botId, uint256 amount);
    event BotDeallocated(address indexed user, uint8 indexed botId, uint256 amount);
    event TradeRecorderUpdated(address indexed recorder);
    event TradeOpened(
        uint256 indexed tradeId,
        address indexed user,
        uint8 indexed botId,
        string symbol,
        bool isLong,
        uint256 collateral,
        uint256 entryPrice
    );
    event TradeClosed(
        uint256 indexed tradeId,
        address indexed user,
        uint8 indexed botId,
        uint256 exitPrice,
        int256 pnl,
        bool win
    );

    error UnknownBot(uint8 botId);
    error UnauthorizedRecorder();
    error InsufficientAvailableBalance();
    error InsufficientBotAllocation();
    error InvalidTrade();
    error TradeAlreadyClosed();

    constructor(address token, address initialOwner) Ownable(initialOwner) {
        collateralToken = IMintableCollateral(token);
        bots[1] = Bot("Finn", "Momentum", true);
        bots[2] = Bot("Tycoon", "Trend follower", true);
        bots[3] = Bot("Puff", "Breakout", true);
        bots[4] = Bot("Gemma", "Range", true);
        bots[5] = Bot("Josh", "Trend reversal", true);
    }

    modifier onlyKnownBot(uint8 botId) {
        if (!bots[botId].enabled) revert UnknownBot(botId);
        _;
    }

    modifier onlyRecorder() {
        if (msg.sender != tradeRecorder && msg.sender != owner()) revert UnauthorizedRecorder();
        _;
    }

    function setTradeRecorder(address recorder) external onlyOwner {
        tradeRecorder = recorder;
        emit TradeRecorderUpdated(recorder);
    }

    function deposit(uint256 amount) external nonReentrant {
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        availableBalance[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (availableBalance[msg.sender] < amount) revert InsufficientAvailableBalance();
        availableBalance[msg.sender] -= amount;
        collateralToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function allocate(uint8 botId, uint256 amount) external onlyKnownBot(botId) {
        if (availableBalance[msg.sender] < amount) revert InsufficientAvailableBalance();
        availableBalance[msg.sender] -= amount;
        botAllocation[msg.sender][botId] += amount;
        emit BotAllocated(msg.sender, botId, amount);
    }

    function deallocate(uint8 botId, uint256 amount) external onlyKnownBot(botId) {
        if (botAllocation[msg.sender][botId] < amount) revert InsufficientBotAllocation();
        botAllocation[msg.sender][botId] -= amount;
        availableBalance[msg.sender] += amount;
        emit BotDeallocated(msg.sender, botId, amount);
    }

    function openTrade(
        address user,
        uint8 botId,
        string calldata symbol,
        bool isLong,
        uint256 collateral,
        uint256 entryPrice
    ) external onlyRecorder onlyKnownBot(botId) returns (uint256 tradeId) {
        if (botAllocation[user][botId] < collateral) revert InsufficientBotAllocation();

        botAllocation[user][botId] -= collateral;
        tradeId = nextTradeId++;

        trades[tradeId] = Trade({
            id: tradeId,
            user: user,
            botId: botId,
            symbol: symbol,
            isLong: isLong,
            collateral: collateral,
            entryPrice: entryPrice,
            exitPrice: 0,
            pnl: 0,
            openedAt: uint64(block.timestamp),
            closedAt: 0,
            status: TradeStatus.Open
        });
        userTradeIds[user].push(tradeId);

        emit TradeOpened(tradeId, user, botId, symbol, isLong, collateral, entryPrice);
    }

    function closeTrade(uint256 tradeId, uint256 exitPrice, int256 pnl) external onlyRecorder {
        Trade storage trade = trades[tradeId];
        if (trade.user == address(0)) revert InvalidTrade();
        if (trade.status == TradeStatus.Closed) revert TradeAlreadyClosed();

        trade.exitPrice = exitPrice;
        trade.pnl = pnl;
        trade.closedAt = uint64(block.timestamp);
        trade.status = TradeStatus.Closed;

        uint256 returnedCapital = trade.collateral;
        if (pnl < 0) {
            uint256 loss = uint256(-pnl);
            returnedCapital = loss >= trade.collateral ? 0 : trade.collateral - loss;
        } else if (pnl > 0) {
            uint256 profit = uint256(pnl);
            collateralToken.mint(address(this), profit);
            returnedCapital = trade.collateral + profit;
        }

        botAllocation[trade.user][trade.botId] += returnedCapital;
        emit TradeClosed(tradeId, trade.user, trade.botId, exitPrice, pnl, pnl >= 0);
    }

    function getUserTrades(address user) external view returns (uint256[] memory) {
        return userTradeIds[user];
    }

    function getBot(uint8 botId) external view returns (Bot memory) {
        return bots[botId];
    }
}
