//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;


interface VRFReceiver {
    function rawFulfillRandomness(bytes32 requestId, uint256 randomness) external;
}

contract MockVRFCoordinator {
    function sendRandomness(VRFReceiver target, bytes32 requestId, uint256 randomness) external {
        target.rawFulfillRandomness(requestId, randomness);
    }

    function onTokenTransfer(address _sender, uint256 _value, bytes memory _data) public {}
}
