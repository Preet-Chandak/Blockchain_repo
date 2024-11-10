// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FileSharing {
    struct File {
        string ipfsHash;
        string fileName;
        uint256 uploadTime;
        address uploader;
    }

    mapping(uint256 => File) public files;
    uint256 public fileCount;

    event FileUploaded(
        uint256 indexed fileId,
        string ipfsHash,
        string fileName,
        uint256 uploadTime,
        address uploader
    );

    function uploadFile(
        string memory _ipfsHash,
        string memory _fileName
    ) public {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(bytes(_fileName).length > 0, "File name cannot be empty");

        fileCount++;
        files[fileCount] = File(
            _ipfsHash,
            _fileName,
            block.timestamp,
            msg.sender
        );

        emit FileUploaded(
            fileCount,
            _ipfsHash,
            _fileName,
            block.timestamp,
            msg.sender
        );
    }

    function getFile(
        uint256 _fileId
    ) public view returns (string memory, string memory, uint256, address) {
        require(_fileId <= fileCount && _fileId > 0, "Invalid file ID");
        File memory file = files[_fileId];
        return (file.ipfsHash, file.fileName, file.uploadTime, file.uploader);
    }
}
