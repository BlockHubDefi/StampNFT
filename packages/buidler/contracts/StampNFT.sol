pragma solidity >=0.6.0 <0.7.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// Uncomment it later on for GasStationNetwork capabilities: import "@opengsn/gsn/contracts/BaseRelayRecipient.sol";

contract StampNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() ERC721("StampItem", "SITM") public {
        // Base URI for all token IDs to save gas:
        _setBaseURI('ipfs://ipfs/');
    }

    function createItem(address to, string memory documentURI) public returns (uint256) {
        _tokenIds.increment();

        uint256 newStampId = _tokenIds.current();
        _mint(to, newStampId);
        // Will temporary store the IPFS hash as a string memory, but will later store it as 2 separate hashes to save gas
        _setTokenURI(newStampId, documentURI);

        return newStampId;
    }
}
