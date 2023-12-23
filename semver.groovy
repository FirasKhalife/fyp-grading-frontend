#!/usr/bin/env groovy

def version() {
    echo "Extracting version from package.json using regex..."

    def workspace = pwd()
    def packageJsonPath = "${workspace}/package.json"
    def packageJsonContent = readFile(packageJsonPath)

    def pattern = ~/"version":\s*"(\d+\.\d+\.\d+)"/
    def matcher = pattern.matcher(packageJsonContent)

    if (matcher.find()) {
        def version = matcher.group(1)
        echo "Version: $version"
        return version
    } else {
        throw new RuntimeException("Version not found in package.json")
    }
}

return this




