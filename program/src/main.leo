import credits.aleo;

program retro_beats_protocol_v0.aleo {

    // On-chain storage of an `account` map, with `address` as the key,
    // and `u64` as the value.
    mapping account: address => u64;
    
    // On-chain storage of a `leaderboard` map, with `address` as key
    // and number of wins as u64 value
    mapping leaderboard: address => u64;

    // Allow a user to call this function to transfer public credits
    // from the contract's account to themselves.
    async transition transfer_back(public move: u64) -> Future {
        // The caller's address is available as self.caller.
        let receiver: address = self.caller;

        let total_to_send: u64 = 0u64;

        if move > 0u64 {
            total_to_send += 10000000u64;
        } else {
            total_to_send += 0u64;
        }

        // issue transfer_public to receiver
        let transfer_future: Future = credits.aleo/transfer_public(receiver, total_to_send);

        // Perform the transfer from the contract's account to the caller.
        // The contract's account is represented by self.address.
        return finalize_transfer_back(self.address, receiver, total_to_send, transfer_future);
    }

    // Finalize the transfer by updating the mapping.
    async function finalize_transfer_back(public sender: address, public receiver: address, public amount: u64, transfer_future: Future) {
        // if a win - update leaderboard
        if amount == 10000000u64 {
            // transfer_public to receiver
            transfer_future.await();

            let receiver_amount: u64 = Mapping::get_or_use(leaderboard, receiver, 0u64);
            Mapping::set(leaderboard, receiver, receiver_amount + 1u64);
        }
    }
}