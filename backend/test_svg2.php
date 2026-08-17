<?php
require 'vendor/autoload.php';
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use chillerlan\QRCode\Output\QRMarkupSVG;
$o=new QROptions();
$o->outputType=QRMarkupSVG::class;
$o->imageBase64=true;
echo substr((new QRCode($o))->render('test'), 0, 50);
