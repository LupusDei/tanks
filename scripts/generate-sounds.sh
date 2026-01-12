#!/bin/bash
# Generate game sound effects using ffmpeg

SOUNDS_DIR="public/sounds"
mkdir -p "$SOUNDS_DIR/music" "$SOUNDS_DIR/sfx" "$SOUNDS_DIR/ui"

echo "Generating sound effects..."

# ============================================================================
# MUSIC
# ============================================================================

echo "Creating menu music..."
# Menu music - ambient, calm pad with slow modulation (8 second loop)
ffmpeg -y -f lavfi -i "sine=frequency=220:duration=8" \
  -f lavfi -i "sine=frequency=277:duration=8" \
  -f lavfi -i "sine=frequency=330:duration=8" \
  -f lavfi -i "sine=frequency=165:duration=8" \
  -filter_complex "[0]volume=0.15,afade=t=in:st=0:d=1,afade=t=out:st=7:d=1[a]; \
    [1]volume=0.12,afade=t=in:st=0.5:d=1,afade=t=out:st=7:d=1[b]; \
    [2]volume=0.1,afade=t=in:st=1:d=1,afade=t=out:st=7:d=1[c]; \
    [3]volume=0.2,afade=t=in:st=0:d=0.5,afade=t=out:st=7.5:d=0.5[d]; \
    [a][b][c][d]amix=inputs=4:duration=longest,aloop=loop=-1:size=352800" \
  -t 8 -ar 44100 -b:a 128k "$SOUNDS_DIR/music/menu.mp3" 2>/dev/null

echo "Creating gameplay music..."
# Gameplay music - more energetic, tension-building (8 second loop)
ffmpeg -y -f lavfi -i "sine=frequency=146:duration=8" \
  -f lavfi -i "sine=frequency=185:duration=8" \
  -f lavfi -i "sine=frequency=220:duration=8" \
  -f lavfi -i "anoisesrc=d=8:c=pink:a=0.02" \
  -filter_complex "[0]volume=0.2,tremolo=f=2:d=0.3[a]; \
    [1]volume=0.15,tremolo=f=3:d=0.2[b]; \
    [2]volume=0.12,tremolo=f=4:d=0.15[c]; \
    [3]lowpass=f=400[d]; \
    [a][b][c][d]amix=inputs=4:duration=longest,afade=t=in:st=0:d=0.5,afade=t=out:st=7.5:d=0.5" \
  -t 8 -ar 44100 -b:a 128k "$SOUNDS_DIR/music/gameplay.mp3" 2>/dev/null

echo "Creating victory music..."
# Victory fanfare - triumphant ascending notes
ffmpeg -y -f lavfi -i "sine=frequency=440:duration=0.3" \
  -f lavfi -i "sine=frequency=554:duration=0.3" \
  -f lavfi -i "sine=frequency=659:duration=0.3" \
  -f lavfi -i "sine=frequency=880:duration=0.8" \
  -filter_complex "[0]adelay=0[a]; \
    [1]adelay=300[b]; \
    [2]adelay=600[c]; \
    [3]adelay=900,afade=t=out:st=1.2:d=0.5[d]; \
    [a][b][c][d]amix=inputs=4:duration=longest,volume=0.4" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/music/victory.mp3" 2>/dev/null

echo "Creating defeat music..."
# Defeat - descending, somber notes
ffmpeg -y -f lavfi -i "sine=frequency=392:duration=0.4" \
  -f lavfi -i "sine=frequency=349:duration=0.4" \
  -f lavfi -i "sine=frequency=293:duration=0.6" \
  -filter_complex "[0]adelay=0,afade=t=out:st=0.2:d=0.2[a]; \
    [1]adelay=400,afade=t=out:st=0.6:d=0.2[b]; \
    [2]adelay=800,afade=t=out:st=1.2:d=0.4[c]; \
    [a][b][c]amix=inputs=3:duration=longest,volume=0.3" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/music/defeat.mp3" 2>/dev/null

# ============================================================================
# WEAPON FIRE SFX
# ============================================================================

echo "Creating weapon fire sounds..."

# Standard cannon - classic boom
ffmpeg -y -f lavfi -i "anoisesrc=d=0.3:c=brown:a=0.8" \
  -af "lowpass=f=300,highpass=f=50,afade=t=out:st=0.1:d=0.2,volume=0.6" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/fire_standard.mp3" 2>/dev/null

# Heavy artillery - deep powerful blast
ffmpeg -y -f lavfi -i "anoisesrc=d=0.5:c=brown:a=1" \
  -f lavfi -i "sine=frequency=60:duration=0.5" \
  -filter_complex "[0]lowpass=f=200[a]; \
    [1]volume=0.5[b]; \
    [a][b]amix=inputs=2,afade=t=out:st=0.2:d=0.3,volume=0.7" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/fire_heavy.mp3" 2>/dev/null

# Precision/sniper - sharp crack
ffmpeg -y -f lavfi -i "anoisesrc=d=0.15:c=white:a=0.6" \
  -af "highpass=f=2000,afade=t=out:st=0.05:d=0.1,volume=0.5" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/fire_precision.mp3" 2>/dev/null

# Cluster bomb - multiple pops
ffmpeg -y -f lavfi -i "anoisesrc=d=0.4:c=pink:a=0.5" \
  -af "tremolo=f=20:d=0.8,afade=t=out:st=0.2:d=0.2,volume=0.5" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/fire_cluster.mp3" 2>/dev/null

# Napalm - whoosh with fire crackle
ffmpeg -y -f lavfi -i "anoisesrc=d=0.6:c=pink:a=0.4" \
  -af "highpass=f=500,lowpass=f=3000,tremolo=f=8:d=0.5,afade=t=in:st=0:d=0.1,afade=t=out:st=0.3:d=0.3,volume=0.5" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/fire_napalm.mp3" 2>/dev/null

# EMP - electric zap
ffmpeg -y -f lavfi -i "anoisesrc=d=0.3:c=white:a=0.3" \
  -f lavfi -i "sine=frequency=1200:duration=0.3" \
  -filter_complex "[0]highpass=f=1000[a]; \
    [1]tremolo=f=50:d=1,volume=0.3[b]; \
    [a][b]amix=inputs=2,afade=t=out:st=0.1:d=0.2,volume=0.5" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/fire_emp.mp3" 2>/dev/null

# Bouncing betty - boing sound
ffmpeg -y -f lavfi -i "sine=frequency=400:duration=0.3" \
  -af "vibrato=f=20:d=0.5,afade=t=out:st=0.1:d=0.2,volume=0.5" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/fire_bouncing.mp3" 2>/dev/null

# Bunker buster - heavy thud
ffmpeg -y -f lavfi -i "anoisesrc=d=0.4:c=brown:a=0.9" \
  -f lavfi -i "sine=frequency=40:duration=0.4" \
  -filter_complex "[0]lowpass=f=150[a]; \
    [1]volume=0.6[b]; \
    [a][b]amix=inputs=2,afade=t=out:st=0.15:d=0.25,volume=0.7" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/fire_bunker.mp3" 2>/dev/null

# Homing missile - rocket whoosh
ffmpeg -y -f lavfi -i "anoisesrc=d=0.5:c=pink:a=0.4" \
  -f lavfi -i "sine=frequency=800:duration=0.5" \
  -filter_complex "[0]highpass=f=300,lowpass=f=2000[a]; \
    [1]volume=0.2,tremolo=f=10:d=0.3[b]; \
    [a][b]amix=inputs=2,afade=t=in:st=0:d=0.1,afade=t=out:st=0.3:d=0.2,volume=0.5" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/fire_homing.mp3" 2>/dev/null

# ============================================================================
# EXPLOSION SFX
# ============================================================================

echo "Creating explosion sounds..."

# Small explosion
ffmpeg -y -f lavfi -i "anoisesrc=d=0.4:c=brown:a=0.7" \
  -af "lowpass=f=400,afade=t=out:st=0.1:d=0.3,volume=0.5" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/explosion_small.mp3" 2>/dev/null

# Medium explosion
ffmpeg -y -f lavfi -i "anoisesrc=d=0.6:c=brown:a=0.9" \
  -f lavfi -i "sine=frequency=80:duration=0.6" \
  -filter_complex "[0]lowpass=f=350[a]; \
    [1]volume=0.4[b]; \
    [a][b]amix=inputs=2,afade=t=out:st=0.2:d=0.4,volume=0.6" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/explosion_medium.mp3" 2>/dev/null

# Large explosion
ffmpeg -y -f lavfi -i "anoisesrc=d=0.8:c=brown:a=1" \
  -f lavfi -i "sine=frequency=50:duration=0.8" \
  -f lavfi -i "sine=frequency=30:duration=0.8" \
  -filter_complex "[0]lowpass=f=300[a]; \
    [1]volume=0.5[b]; \
    [2]volume=0.4[c]; \
    [a][b][c]amix=inputs=3,afade=t=out:st=0.3:d=0.5,volume=0.8" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/explosion_large.mp3" 2>/dev/null

# Fire explosion (napalm)
ffmpeg -y -f lavfi -i "anoisesrc=d=0.7:c=pink:a=0.6" \
  -af "highpass=f=200,lowpass=f=2000,tremolo=f=15:d=0.6,afade=t=out:st=0.3:d=0.4,volume=0.6" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/explosion_fire.mp3" 2>/dev/null

# Electric explosion (EMP)
ffmpeg -y -f lavfi -i "anoisesrc=d=0.5:c=white:a=0.4" \
  -f lavfi -i "sine=frequency=2000:duration=0.5" \
  -filter_complex "[0]highpass=f=800[a]; \
    [1]tremolo=f=60:d=1,volume=0.3[b]; \
    [a][b]amix=inputs=2,afade=t=out:st=0.2:d=0.3,volume=0.5" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/explosion_electric.mp3" 2>/dev/null

# ============================================================================
# TANK & GAME SFX
# ============================================================================

echo "Creating tank and game sounds..."

# Tank destruction - dramatic
ffmpeg -y -f lavfi -i "anoisesrc=d=1:c=brown:a=1" \
  -f lavfi -i "sine=frequency=60:duration=1" \
  -f lavfi -i "anoisesrc=d=1:c=pink:a=0.3" \
  -filter_complex "[0]lowpass=f=250[a]; \
    [1]volume=0.5,afade=t=out:st=0.3:d=0.7[b]; \
    [2]highpass=f=1000,tremolo=f=20:d=0.5[c]; \
    [a][b][c]amix=inputs=3,afade=t=out:st=0.5:d=0.5,volume=0.8" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/tank_destruction.mp3" 2>/dev/null

# Tank hit - impact
ffmpeg -y -f lavfi -i "anoisesrc=d=0.2:c=brown:a=0.6" \
  -f lavfi -i "sine=frequency=150:duration=0.2" \
  -filter_complex "[0]lowpass=f=400[a]; \
    [1]volume=0.3[b]; \
    [a][b]amix=inputs=2,afade=t=out:st=0.05:d=0.15,volume=0.5" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/tank_hit.mp3" 2>/dev/null

# Money earned - coin sound
ffmpeg -y -f lavfi -i "sine=frequency=1200:duration=0.1" \
  -f lavfi -i "sine=frequency=1600:duration=0.15" \
  -filter_complex "[0]afade=t=out:st=0.05:d=0.05[a]; \
    [1]adelay=100,afade=t=out:st=0.1:d=0.05[b]; \
    [a][b]amix=inputs=2,volume=0.4" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/sfx/money_earned.mp3" 2>/dev/null

# ============================================================================
# UI SOUNDS
# ============================================================================

echo "Creating UI sounds..."

# Hover - subtle tick
ffmpeg -y -f lavfi -i "sine=frequency=800:duration=0.05" \
  -af "afade=t=out:st=0.02:d=0.03,volume=0.25" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/ui/hover.mp3" 2>/dev/null

# Click - button click
ffmpeg -y -f lavfi -i "sine=frequency=600:duration=0.08" \
  -f lavfi -i "anoisesrc=d=0.08:c=white:a=0.1" \
  -filter_complex "[0]volume=0.4[a]; \
    [1]highpass=f=2000[b]; \
    [a][b]amix=inputs=2,afade=t=out:st=0.03:d=0.05,volume=0.4" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/ui/click.mp3" 2>/dev/null

# Purchase - cash register
ffmpeg -y -f lavfi -i "sine=frequency=880:duration=0.1" \
  -f lavfi -i "sine=frequency=1100:duration=0.1" \
  -f lavfi -i "sine=frequency=1320:duration=0.15" \
  -filter_complex "[0]afade=t=out:st=0.05:d=0.05[a]; \
    [1]adelay=100,afade=t=out:st=0.05:d=0.05[b]; \
    [2]adelay=200,afade=t=out:st=0.1:d=0.05[c]; \
    [a][b][c]amix=inputs=3,volume=0.4" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/ui/purchase.mp3" 2>/dev/null

# Error - buzz
ffmpeg -y -f lavfi -i "sine=frequency=200:duration=0.2" \
  -af "tremolo=f=30:d=1,afade=t=out:st=0.1:d=0.1,volume=0.3" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/ui/error.mp3" 2>/dev/null

# Turn change - whoosh
ffmpeg -y -f lavfi -i "anoisesrc=d=0.3:c=pink:a=0.3" \
  -af "highpass=f=500,lowpass=f=3000,afade=t=in:st=0:d=0.1,afade=t=out:st=0.15:d=0.15,volume=0.3" \
  -ar 44100 -b:a 128k "$SOUNDS_DIR/ui/turn_change.mp3" 2>/dev/null

echo "Done! Sound files created in $SOUNDS_DIR"
ls -la "$SOUNDS_DIR/music/" "$SOUNDS_DIR/sfx/" "$SOUNDS_DIR/ui/"
