// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.6.6;

import "./BColor.sol";

contract BConst is BBronze {
    uint public constant BONE              = 10**18;

    uint public constant MIN_BOUND_TOKENS  = 2;
    // uint public constant MAX_BOUND_TOKENS  = 8;              // not included - determined implicitly by governance

    uint public constant MIN_FEE           = BONE / 10**6;
    uint public constant MAX_FEE           = BONE / 10;
    // uint public constant EXIT_FEE          = 0;              // moved to configurable param

    uint public constant MIN_WEIGHT        = BONE;              // Future: make configurable to allow more weight granularity
    uint public constant MAX_WEIGHT        = BONE * 1000;       // Future: make configurable to allow more weight granularity
    uint public constant MAX_TOTAL_WEIGHT  = BONE * 1000;       // Future: make configurable to allow more weight granularity
    uint public constant MIN_BALANCE       = BONE / 10**12;

    uint public constant INIT_POOL_SUPPLY  = BONE * 100;

    uint public constant MIN_BPOW_BASE     = 1 wei;
    uint public constant MAX_BPOW_BASE     = (2 * BONE) - 1 wei;
    uint public constant BPOW_PRECISION    = BONE / 10**10;

    uint public constant MAX_IN_RATIO      = BONE / 2;
    uint public constant MAX_OUT_RATIO     = (BONE / 3) + 1 wei;
}
