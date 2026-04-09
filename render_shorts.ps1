$ffmpeg = "f:\ProJectHome\AI MUSIC AGENT OZ\node_modules\ffmpeg-static\ffmpeg.exe"
$audio = "f:\ProJectHome\AI MUSIC AGENT OZ\loops\loop_Rainy_Day_Open-air_Cafe_inst\track_0.mp3"
$image = "f:\ProJectHome\AI MUSIC AGENT OZ\loops\loop_Rainy_Day_Open-air_Cafe_inst\background_0.png"
$output = "f:\ProJectHome\AI MUSIC AGENT OZ\loops\loop_Rainy_Day_Open-air_Cafe_inst\Rainy_Day_Open-air_Cafe_Shorts_v2.mp4"

& $ffmpeg -y -loop 1 -i "$image" -i "$audio" -filter_complex "[0:v]scale=1080:1920,setsar=1[out]" -map "[out]" -map 1:a -c:v libx264 -crf 28 -pix_fmt yuv420p -shortest "$output"
