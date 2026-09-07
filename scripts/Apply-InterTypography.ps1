$root = Join-Path (Get-Location) "src"

$files = Get-ChildItem `
    -Path $root `
    -Recurse `
    -Include *.js,*.jsx,*.tsx `
    -File

foreach ($file in $files) {

    # Do not modify AppText itself
    if ($file.FullName -like "*components\AppText.js") {
        continue
    }

    $text = Get-Content `
        -LiteralPath $file.FullName `
        -Raw

    $original = $text

    # Remove Text from react-native named imports
    $text = $text -replace `
        '(?m)^\s*Text,\s*$', ''

    # Add AppText import if the file actually contains JSX Text
    if ($text -match '<Text[\s>]') {

        if ($file.FullName -like "*src\screens\*") {

            if ($text -notmatch 'import AppText from "\.\./components/AppText";') {

                $text = 'import AppText from "../components/AppText";' `
                    + [Environment]::NewLine `
                    + $text
            }
        }

        elseif ($file.FullName -like "*src\navigation\*") {

            if ($text -notmatch 'import AppText from "\.\./components/AppText";') {

                $text = 'import AppText from "../components/AppText";' `
                    + [Environment]::NewLine `
                    + $text
            }
        }
    }

    # JSX opening tags
    $text = $text -replace '<Text(\s|>)', '<AppText$1'

    # JSX closing tags
    $text = $text -replace '</Text>', '</AppText>'

    if ($text -ne $original) {

        Set-Content `
            -LiteralPath $file.FullName `
            -Value $text `
            -Encoding UTF8

        Write-Host "Updated:" $file.FullName
    }
}

Write-Host ""
Write-Host "============================================"
Write-Host " Inter typography update completed"
Write-Host "============================================"