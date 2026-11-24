# Fonts

`archivo-text.woff2` is Archivo (the text of the site) with only what the site uses: the Latin
letters, weights 300 to 600 and widths 100% to 112%. It weighs 48 KB instead of 88 KB, so phones
show the page sooner. Letters outside it (Polish, Turkish…) still come from the full font.

Needing another weight or width means making it again, from
`node_modules/@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2`, with
[fonttools](https://github.com/fonttools/fonttools) (`pip install fonttools brotli`):

    fonttools varLib.instancer archivo-latin-standard-normal.woff2 wght=300:400:600 wdth=100:100:112 -o archivo.ttf
    pyftsubset archivo.ttf --unicodes='*' --layout-features=rvrn,kern,mark,mkmk,liga,ccmp,locl,calt --no-hinting --flavor=woff2 --output-file=archivo-text.woff2

and changing the ranges in `src/styles/fonts.css` to match.

Archivo is by the Archivo Project Authors, under the SIL Open Font License (`OFL.txt`). Archivo
Black and Instrument Serif come whole from their npm packages.
