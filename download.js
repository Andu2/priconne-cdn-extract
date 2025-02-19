const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const config = require('./config');
const utils = require('./utils');

config.servers.forEach(function(server) {
    run(server);
});

function run(server = "en") {
    const server_out_dir = path.join(config.outDir, server);
    fs.readdirSync(server_out_dir, { withFileTypes: true })
        .filter(function(path) {
            return path.isDirectory();
        })
        .forEach(async function(manifestPath) {
            if (config.includeManifests.indexOf(manifestPath.name) === -1) return;
            const manifest_dir = path.join(server_out_dir, manifestPath.name);
            const asset_version_file = path.join(manifest_dir, 'asset-versions.json');
            const asset_version_info = JSON.parse(fs.readFileSync(asset_version_file, 'utf8'));

            let latestVersionPath = path.join(manifest_dir, "raw", "latest");
            if (!fs.existsSync(latestVersionPath)) {
                fs.mkdirSync(latestVersionPath, { recursive: true });
            }

            for (var file in asset_version_info.files) {
                let filePath = file.split("/").slice(-1)[0];
                for (var version in asset_version_info.files[file].versions) {
                    let versionPath = path.join(manifest_dir, "raw", version);
                    if (!fs.existsSync(versionPath)) {
                        fs.mkdirSync(versionPath, { recursive: true });
                    }
                    let versionFilePath = path.join(versionPath, filePath);
                    if (!fs.existsSync(versionFilePath)) {
                        console.log("[[" + server + "]] DOWNLOADING " + versionFilePath);
                        let type = "asset";
                        if (manifestPath.name === "sound") {
                            type = "sound";
                        }
                        let res = await fetchAsset(asset_version_info.files[file].versions[version].hash, server, type);
                        if (res) {
                            fs.writeFile(versionFilePath, res, "binary", function (err) {
                                if (err) throw err;
                            });
                            if (asset_version_info.files[file].latestHash === asset_version_info.files[file].versions[version].hash) {
                                let latestVersionPath = path.join(manifest_dir, "raw", "latest", filePath);
                                fs.writeFile(latestVersionPath, res, "binary", function (err) {
                                    if (err) throw err;
                                });
                            }
                        }
                        else {
                            console.log("[[" + server + "]] UNABLE TO DOWNLOAD " + versionFilePath);
                        }
                    }
                }
            }
            console.log("[[" + server + "]] DONE DOWNLOADING " + manifestPath.name)
        });
}

function downloadManifest(manifestPath) {

}

function fetchAsset(hash, server, type = "asset") {
    const host = utils.cdnHosts[server];
    let path = '/dl/pool/AssetBundles/' + hash.substr(0, 2) + '/' + hash;
    if (type === "sound") {
        path = '/dl/pool/Sound/' + hash.substr(0, 2) + '/' + hash;
    }
    else if (type === "movie") {
        path = '/dl/pool/Movie/' + hash.substr(0, 2) + '/' + hash;
    }
    return fetch("https://" + host + path).then(function(res) {
        if (res.status === 200) {
            return res.buffer();
        }
        else {
            return null;
        }
    }).catch(function(error) {
        console.log(error);
        return null;
    });
}
