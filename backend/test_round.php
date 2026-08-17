<?php
require_once __DIR__ . '/vendor/autoload.php';

use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\Data\QRMatrix;

$options = new QROptions();
$options->outputType = QRGdImagePNG::class;
$options->scale = 5;
$options->quietzoneSize = 4;
$options->drawCircularModules = true;
$options->circleRadius = 0.45;
$options->keepAsSquare = [
    QRMatrix::M_FINDER | QRMatrix::IS_DARK,
    QRMatrix::M_FINDER,
    QRMatrix::M_FINDER_DOT | QRMatrix::IS_DARK,
    QRMatrix::M_ALIGNMENT | QRMatrix::IS_DARK,
    QRMatrix::M_ALIGNMENT
];

$qrcode = (new QRCode($options))->render('https://www.sandslab.com');
file_put_contents(__DIR__ . '/test_round.png', base64_decode(explode(',', $qrcode)[1]));
echo "Done";
