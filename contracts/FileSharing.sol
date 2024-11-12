// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FileSharing {
    struct File {
        string ipfsHash;
        string fileName;
        uint256 uploadTime;
        address uploader;
        address[] sharedWith;  
    }

    mapping(uint256 => File) public files;
    uint256 public fileCount;

    event FileUploaded(uint256 indexed fileId, string ipfsHash, string fileName, address uploader);
    event FileShared(uint256 indexed fileId, address sharedWith);

    function uploadFile(string memory _ipfsHash, string memory _fileName) public {
        fileCount++;
        address[] memory emptyAddressArray = new address[](0);
        files[fileCount] = File(
            _ipfsHash,
            _fileName,
            block.timestamp,
            msg.sender,
            emptyAddressArray
        );

        emit FileUploaded(fileCount, _ipfsHash, _fileName, msg.sender);
    }

    function shareFile(uint256 _fileId, address _user) public {
        require(files[_fileId].uploader == msg.sender, "You are not the uploader");
        files[_fileId].sharedWith.push(_user);
        emit FileShared(_fileId, _user);
    }

    function getFile(uint256 _fileId) public view returns (string memory, string memory, uint256, address, address[] memory) {
        File storage file = files[_fileId];
        return (file.ipfsHash, file.fileName, file.uploadTime, file.uploader, file.sharedWith);
    }

    function getSharedFiles() public view returns (uint256[] memory) {
        uint256[] memory sharedFileIds = new uint256[](fileCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= fileCount; i++) {
            for (uint256 j = 0; j < files[i].sharedWith.length; j++) {
                if (files[i].sharedWith[j] == msg.sender) {
                    sharedFileIds[index] = i;
                    index++;
                    break;
                }
            }
        }

        // Resize the array to the actual count of shared files
        uint256[] memory result = new uint256[](index);
        for (uint256 k = 0; k < index; k++) {
            result[k] = sharedFileIds[k];
        }
        return result;
    }
}