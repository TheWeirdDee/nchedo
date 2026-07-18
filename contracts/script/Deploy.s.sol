// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {NchedoFactory} from "../src/NchedoFactory.sol";

/// Deploys the factory. Everything else is created from the web page.
///
///   forge script script/Deploy.s.sol:Deploy \
///     --rpc-url $MONAD_RPC_URL --broadcast --verify
contract Deploy is Script {
    function run() external returns (address factory) {
        uint256 pk = vm.envUint("VAULT_OWNER_KEY");

        vm.startBroadcast(pk);
        NchedoFactory f = new NchedoFactory();
        vm.stopBroadcast();

        console2.log("NchedoFactory:", address(f));
        console2.log("");
        console2.log("Put this in web/.env.local:");
        console2.log("NEXT_PUBLIC_FACTORY_ADDRESS=%s", address(f));

        return address(f);
    }
}
