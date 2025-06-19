"use client";

import { useState, useEffect } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ScrollArea } from "./scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Search, Smile, Heart, Star, Clock, Flag, Activity, MapPin } from "lucide-react";

interface EmojiData {
  emoji: string;
  name: string;
  category: string;
  keywords?: string[];
}

// Emoji data organized by categories
const emojiCategories = {
  recent: {
    name: "Recent",
    icon: Clock,
    emojis: [] as EmojiData[], // Will be populated from localStorage
  },
  smileys: {
    name: "Smileys & People",
    icon: Smile,
    emojis: [
      { emoji: "😀", name: "grinning face", category: "smileys", keywords: ["happy", "smile", "joy"] },
      { emoji: "😃", name: "grinning face with big eyes", category: "smileys", keywords: ["happy", "joy", "grin"] },
      { emoji: "😄", name: "grinning face with smiling eyes", category: "smileys", keywords: ["happy", "joy", "laugh"] },
      { emoji: "😁", name: "beaming face with smiling eyes", category: "smileys", keywords: ["happy", "grin"] },
      { emoji: "😆", name: "grinning squinting face", category: "smileys", keywords: ["laugh", "happy", "haha"] },
      { emoji: "😅", name: "grinning face with sweat", category: "smileys", keywords: ["hot", "laugh", "relief"] },
      { emoji: "🤣", name: "rolling on the floor laughing", category: "smileys", keywords: ["laugh", "lol", "rofl"] },
      { emoji: "😂", name: "face with tears of joy", category: "smileys", keywords: ["laugh", "cry", "joy"] },
      { emoji: "🙂", name: "slightly smiling face", category: "smileys", keywords: ["smile", "happy"] },
      { emoji: "🙃", name: "upside-down face", category: "smileys", keywords: ["silly", "upside", "down"] },
      { emoji: "😉", name: "winking face", category: "smileys", keywords: ["wink", "flirt"] },
      { emoji: "😊", name: "smiling face with smiling eyes", category: "smileys", keywords: ["smile", "happy", "joy"] },
      { emoji: "😇", name: "smiling face with halo", category: "smileys", keywords: ["angel", "innocent"] },
      { emoji: "🥰", name: "smiling face with hearts", category: "smileys", keywords: ["love", "heart", "adore"] },
      { emoji: "😍", name: "smiling face with heart-eyes", category: "smileys", keywords: ["love", "heart", "like"] },
      { emoji: "🤩", name: "star-struck", category: "smileys", keywords: ["star", "eyes", "amazing"] },
      { emoji: "😘", name: "face blowing a kiss", category: "smileys", keywords: ["kiss", "love"] },
      { emoji: "😗", name: "kissing face", category: "smileys", keywords: ["kiss"] },
      { emoji: "😚", name: "kissing face with closed eyes", category: "smileys", keywords: ["kiss"] },
      { emoji: "😙", name: "kissing face with smiling eyes", category: "smileys", keywords: ["kiss", "smile"] },
      { emoji: "😋", name: "face savoring food", category: "smileys", keywords: ["food", "yummy", "delicious"] },
      { emoji: "😛", name: "face with tongue", category: "smileys", keywords: ["tongue", "silly"] },
      { emoji: "😜", name: "winking face with tongue", category: "smileys", keywords: ["wink", "tongue", "silly"] },
      { emoji: "🤪", name: "zany face", category: "smileys", keywords: ["crazy", "silly", "wild"] },
      { emoji: "😝", name: "squinting face with tongue", category: "smileys", keywords: ["tongue", "silly"] },
      { emoji: "🤑", name: "money-mouth face", category: "smileys", keywords: ["money", "rich"] },
      { emoji: "🤗", name: "hugging face", category: "smileys", keywords: ["hug", "thanks"] },
      { emoji: "🤭", name: "face with hand over mouth", category: "smileys", keywords: ["quiet", "secret"] },
      { emoji: "🤫", name: "shushing face", category: "smileys", keywords: ["quiet", "shh"] },
      { emoji: "🤔", name: "thinking face", category: "smileys", keywords: ["think", "consider"] },
      { emoji: "🤐", name: "zipper-mouth face", category: "smileys", keywords: ["quiet", "zip"] },
      { emoji: "🤨", name: "face with raised eyebrow", category: "smileys", keywords: ["suspicious", "doubt"] },
      { emoji: "😐", name: "neutral face", category: "smileys", keywords: ["neutral", "meh"] },
      { emoji: "😑", name: "expressionless face", category: "smileys", keywords: ["neutral", "blank"] },
      { emoji: "😶", name: "face without mouth", category: "smileys", keywords: ["quiet", "silent"] },
      { emoji: "😏", name: "smirking face", category: "smileys", keywords: ["smirk", "confident"] },
      { emoji: "😒", name: "unamused face", category: "smileys", keywords: ["annoyed", "unimpressed"] },
      { emoji: "🙄", name: "face with rolling eyes", category: "smileys", keywords: ["roll", "eyes", "annoyed"] },
      { emoji: "😬", name: "grimacing face", category: "smileys", keywords: ["grimace", "awkward"] },
      { emoji: "🤥", name: "lying face", category: "smileys", keywords: ["lie", "pinocchio"] },
      { emoji: "😔", name: "pensive face", category: "smileys", keywords: ["sad", "thinking"] },
      { emoji: "😪", name: "sleepy face", category: "smileys", keywords: ["tired", "sleep"] },
      { emoji: "🤤", name: "drooling face", category: "smileys", keywords: ["drool", "sleep"] },
      { emoji: "😴", name: "sleeping face", category: "smileys", keywords: ["sleep", "tired"] },
      { emoji: "😷", name: "face with medical mask", category: "smileys", keywords: ["sick", "mask"] },
      { emoji: "🤒", name: "face with thermometer", category: "smileys", keywords: ["sick", "fever"] },
      { emoji: "🤕", name: "face with head-bandage", category: "smileys", keywords: ["hurt", "injured"] },
      { emoji: "🤢", name: "nauseated face", category: "smileys", keywords: ["sick", "nauseous"] },
      { emoji: "🤮", name: "face vomiting", category: "smileys", keywords: ["sick", "vomit"] },
      { emoji: "🤧", name: "sneezing face", category: "smileys", keywords: ["sick", "sneeze"] },
      { emoji: "🥵", name: "hot face", category: "smileys", keywords: ["hot", "heat"] },
      { emoji: "🥶", name: "cold face", category: "smileys", keywords: ["cold", "freeze"] },
      { emoji: "🥴", name: "woozy face", category: "smileys", keywords: ["dizzy", "confused"] },
      { emoji: "😵", name: "dizzy face", category: "smileys", keywords: ["dizzy", "confused"] },
      { emoji: "🤯", name: "exploding head", category: "smileys", keywords: ["mind", "blown", "shocked"] },
      { emoji: "🤠", name: "cowboy hat face", category: "smileys", keywords: ["cowboy", "hat"] },
      { emoji: "🥳", name: "partying face", category: "smileys", keywords: ["party", "celebrate"] },
      { emoji: "😎", name: "smiling face with sunglasses", category: "smileys", keywords: ["cool", "sunglasses"] },
      { emoji: "🤓", name: "nerd face", category: "smileys", keywords: ["nerd", "geek", "smart"] },
      { emoji: "🧐", name: "face with monocle", category: "smileys", keywords: ["monocle", "fancy"] },
      { emoji: "💩", name: "shit", category: "smileys", keywords: ["shit", "tae"] },
      { emoji: "🤬", name: "mad", category: "smileys", keywords: ["mad", "angry"] },
    ],
  },
  hearts: {
    name: "Hearts & Gestures",
    icon: Heart,
    emojis: [
      { emoji: "❤️", name: "red heart", category: "hearts", keywords: ["love", "heart", "red"] },
      { emoji: "🧡", name: "orange heart", category: "hearts", keywords: ["love", "heart", "orange"] },
      { emoji: "💛", name: "yellow heart", category: "hearts", keywords: ["love", "heart", "yellow"] },
      { emoji: "💚", name: "green heart", category: "hearts", keywords: ["love", "heart", "green"] },
      { emoji: "💙", name: "blue heart", category: "hearts", keywords: ["love", "heart", "blue"] },
      { emoji: "💜", name: "purple heart", category: "hearts", keywords: ["love", "heart", "purple"] },
      { emoji: "🖤", name: "black heart", category: "hearts", keywords: ["love", "heart", "black"] },
      { emoji: "🤍", name: "white heart", category: "hearts", keywords: ["love", "heart", "white"] },
      { emoji: "🤎", name: "brown heart", category: "hearts", keywords: ["love", "heart", "brown"] },
      { emoji: "💔", name: "broken heart", category: "hearts", keywords: ["heart", "broken", "sad"] },
      { emoji: "❣️", name: "heart exclamation", category: "hearts", keywords: ["heart", "exclamation"] },
      { emoji: "💕", name: "two hearts", category: "hearts", keywords: ["love", "hearts"] },
      { emoji: "💞", name: "revolving hearts", category: "hearts", keywords: ["love", "hearts"] },
      { emoji: "💓", name: "beating heart", category: "hearts", keywords: ["love", "heart", "beat"] },
      { emoji: "💗", name: "growing heart", category: "hearts", keywords: ["love", "heart", "grow"] },
      { emoji: "💖", name: "sparkling heart", category: "hearts", keywords: ["love", "heart", "sparkle"] },
      { emoji: "💘", name: "heart with arrow", category: "hearts", keywords: ["love", "heart", "arrow", "cupid"] },
      { emoji: "💝", name: "heart with ribbon", category: "hearts", keywords: ["love", "heart", "gift"] },
      { emoji: "💟", name: "heart decoration", category: "hearts", keywords: ["love", "heart"] },
      { emoji: "👍", name: "thumbs up", category: "hearts", keywords: ["good", "like", "yes"] },
      { emoji: "👎", name: "thumbs down", category: "hearts", keywords: ["bad", "dislike", "no"] },
      { emoji: "👌", name: "OK hand", category: "hearts", keywords: ["ok", "good", "perfect"] },
      { emoji: "✌️", name: "victory hand", category: "hearts", keywords: ["peace", "victory"] },
      { emoji: "🤞", name: "crossed fingers", category: "hearts", keywords: ["luck", "hope"] },
      { emoji: "🤟", name: "love-you gesture", category: "hearts", keywords: ["love", "rock"] },
      { emoji: "🤘", name: "sign of the horns", category: "hearts", keywords: ["rock", "metal"] },
      { emoji: "🤙", name: "call me hand", category: "hearts", keywords: ["call", "phone"] },
      { emoji: "👏", name: "clapping hands", category: "hearts", keywords: ["clap", "applause", "good"] },
      { emoji: "🙌", name: "raising hands", category: "hearts", keywords: ["celebrate", "hooray"] },
      { emoji: "👐", name: "open hands", category: "hearts", keywords: ["open", "hug"] },
      { emoji: "🤲", name: "palms up together", category: "hearts", keywords: ["pray", "hope"] },
      { emoji: "🤝", name: "handshake", category: "hearts", keywords: ["deal", "agreement"] },
      { emoji: "🙏", name: "folded hands", category: "hearts", keywords: ["pray", "thanks", "please"] },
    ],
  },
  objects: {
    name: "Objects & Symbols",
    icon: Star,
    emojis: [
      { emoji: "⭐", name: "star", category: "objects", keywords: ["star", "favorite"] },
      { emoji: "🌟", name: "glowing star", category: "objects", keywords: ["star", "sparkle"] },
      { emoji: "✨", name: "sparkles", category: "objects", keywords: ["sparkle", "magic"] },
      { emoji: "💫", name: "dizzy", category: "objects", keywords: ["dizzy", "star"] },
      { emoji: "⚡", name: "high voltage", category: "objects", keywords: ["lightning", "energy"] },
      { emoji: "🔥", name: "fire", category: "objects", keywords: ["fire", "hot"] },
      { emoji: "💥", name: "collision", category: "objects", keywords: ["boom", "explosion"] },
      { emoji: "💯", name: "hundred points", category: "objects", keywords: ["100", "perfect"] },
      { emoji: "💢", name: "anger symbol", category: "objects", keywords: ["angry", "mad"] },
      { emoji: "💦", name: "sweat droplets", category: "objects", keywords: ["water", "sweat"] },
      { emoji: "💨", name: "dashing away", category: "objects", keywords: ["fast", "wind"] },
      { emoji: "💤", name: "zzz", category: "objects", keywords: ["sleep", "tired"] },
      { emoji: "💬", name: "speech balloon", category: "objects", keywords: ["chat", "talk"] },
      { emoji: "💭", name: "thought balloon", category: "objects", keywords: ["think", "thought"] },
      { emoji: "💡", name: "light bulb", category: "objects", keywords: ["idea", "light"] },
      { emoji: "📱", name: "mobile phone", category: "objects", keywords: ["phone", "mobile"] },
      { emoji: "💻", name: "laptop", category: "objects", keywords: ["computer", "laptop"] },
      { emoji: "⌨️", name: "keyboard", category: "objects", keywords: ["keyboard", "type"] },
      { emoji: "🖥️", name: "desktop computer", category: "objects", keywords: ["computer", "desktop"] },
      { emoji: "🖨️", name: "printer", category: "objects", keywords: ["print", "printer"] },
      { emoji: "🖱️", name: "computer mouse", category: "objects", keywords: ["mouse", "computer"] },
      { emoji: "💾", name: "floppy disk", category: "objects", keywords: ["save", "disk"] },
      { emoji: "💿", name: "optical disk", category: "objects", keywords: ["cd", "disk"] },
      { emoji: "📀", name: "dvd", category: "objects", keywords: ["dvd", "disk"] },
      { emoji: "🎵", name: "musical note", category: "objects", keywords: ["music", "note"] },
      { emoji: "🎶", name: "musical notes", category: "objects", keywords: ["music", "notes"] },
      { emoji: "🎯", name: "direct hit", category: "objects", keywords: ["target", "goal"] },
      { emoji: "🎪", name: "circus tent", category: "objects", keywords: ["circus", "tent"] },
      { emoji: "🎨", name: "artist palette", category: "objects", keywords: ["art", "paint"] },
      { emoji: "🎭", name: "performing arts", category: "objects", keywords: ["theater", "drama"] },
      { emoji: "🎪", name: "circus tent", category: "objects", keywords: ["circus", "fun"] },
      { emoji: "🎉", name: "party popper", category: "objects", keywords: ["party", "celebrate"] },
      { emoji: "🎊", name: "confetti ball", category: "objects", keywords: ["party", "confetti"] },
      { emoji: "🎈", name: "balloon", category: "objects", keywords: ["balloon", "party"] },
      { emoji: "🎁", name: "wrapped gift", category: "objects", keywords: ["gift", "present"] },
      { emoji: "🎂", name: "birthday cake", category: "objects", keywords: ["cake", "birthday"] },
      { emoji: "🎄", name: "Christmas tree", category: "objects", keywords: ["christmas", "tree"] },
      { emoji: "🎃", name: "jack-o-lantern", category: "objects", keywords: ["halloween", "pumpkin"] },
    ],
  },
  flags: {
    name: "Flags & Activities",
    icon: Flag,
    emojis: [
      { emoji: "🚀", name: "rocket", category: "flags", keywords: ["rocket", "space", "fast"] },
      { emoji: "🛸", name: "flying saucer", category: "flags", keywords: ["ufo", "alien"] },
      { emoji: "🎮", name: "video game", category: "flags", keywords: ["game", "controller"] },
      { emoji: "🎲", name: "game die", category: "flags", keywords: ["dice", "game"] },
      { emoji: "🃏", name: "joker", category: "flags", keywords: ["card", "joker"] },
      { emoji: "🎴", name: "flower playing cards", category: "flags", keywords: ["cards", "game"] },
      { emoji: "🀄", name: "mahjong red dragon", category: "flags", keywords: ["mahjong", "game"] },
      { emoji: "🎯", name: "direct hit", category: "flags", keywords: ["target", "bullseye"] },
      { emoji: "🏆", name: "trophy", category: "flags", keywords: ["win", "champion"] },
      { emoji: "🥇", name: "1st place medal", category: "flags", keywords: ["gold", "first", "win"] },
      { emoji: "🥈", name: "2nd place medal", category: "flags", keywords: ["silver", "second"] },
      { emoji: "🥉", name: "3rd place medal", category: "flags", keywords: ["bronze", "third"] },
      { emoji: "🏅", name: "sports medal", category: "flags", keywords: ["medal", "sports"] },
      { emoji: "🎖️", name: "military medal", category: "flags", keywords: ["medal", "military"] },
      { emoji: "🏵️", name: "rosette", category: "flags", keywords: ["flower", "award"] },
      { emoji: "🎗️", name: "reminder ribbon", category: "flags", keywords: ["ribbon", "reminder"] },
      { emoji: "🎟️", name: "admission tickets", category: "flags", keywords: ["ticket", "event"] },
      { emoji: "🎫", name: "ticket", category: "flags", keywords: ["ticket", "event"] },
      { emoji: "🎪", name: "circus tent", category: "flags", keywords: ["circus", "tent"] },
      { emoji: "🤹", name: "person juggling", category: "flags", keywords: ["juggle", "skill"] },
      { emoji: "🎭", name: "performing arts", category: "flags", keywords: ["theater", "drama"] },
      { emoji: "🩰", name: "ballet shoes", category: "flags", keywords: ["ballet", "dance"] },
      { emoji: "🎨", name: "artist palette", category: "flags", keywords: ["art", "paint"] },
      { emoji: "🎬", name: "clapper board", category: "flags", keywords: ["movie", "film"] },
      { emoji: "🎤", name: "microphone", category: "flags", keywords: ["mic", "sing"] },
      { emoji: "🎧", name: "headphone", category: "flags", keywords: ["music", "headphones"] },
      { emoji: "🎼", name: "musical score", category: "flags", keywords: ["music", "notes"] },
      { emoji: "🎹", name: "musical keyboard", category: "flags", keywords: ["piano", "music"] },
      { emoji: "🥁", name: "drum", category: "flags", keywords: ["drum", "music"] },
      { emoji: "🎷", name: "saxophone", category: "flags", keywords: ["sax", "music"] },
      { emoji: "🎺", name: "trumpet", category: "flags", keywords: ["trumpet", "music"] },
      { emoji: "🎸", name: "guitar", category: "flags", keywords: ["guitar", "music"] },
      { emoji: "🎻", name: "violin", category: "flags", keywords: ["violin", "music"] },
    ],
  },
  nature: {
    name: "Animals & Nature",
    icon: Activity,
    emojis: [
      { emoji: "🐶", name: "dog face", category: "nature", keywords: ["dog", "pet"] },
      { emoji: "🐱", name: "cat face", category: "nature", keywords: ["cat", "pet"] },
      { emoji: "🐭", name: "mouse face", category: "nature", keywords: ["mouse", "pet"] },
      { emoji: "🐹", name: "hamster", category: "nature", keywords: ["hamster", "pet"] },
      { emoji: "🐰", name: "rabbit face", category: "nature", keywords: ["rabbit", "bunny"] },
      { emoji: "🦊", name: "fox", category: "nature", keywords: ["fox", "animal"] },
      { emoji: "🐻", name: "bear", category: "nature", keywords: ["bear", "animal"] },
      { emoji: "🐼", name: "panda", category: "nature", keywords: ["panda", "bear"] },
      { emoji: "🐨", name: "koala", category: "nature", keywords: ["koala", "animal"] },
      { emoji: "🐯", name: "tiger face", category: "nature", keywords: ["tiger", "animal"] },
      { emoji: "🦁", name: "lion", category: "nature", keywords: ["lion", "animal"] },
      { emoji: "🐮", name: "cow face", category: "nature", keywords: ["cow", "animal"] },
      { emoji: "🐷", name: "pig face", category: "nature", keywords: ["pig", "animal"] },
      { emoji: "🐸", name: "frog", category: "nature", keywords: ["frog", "animal"] },
      { emoji: "🐵", name: "monkey face", category: "nature", keywords: ["monkey", "animal"] },
      { emoji: "🙈", name: "see-no-evil monkey", category: "nature", keywords: ["monkey", "see", "evil"] },
      { emoji: "🙉", name: "hear-no-evil monkey", category: "nature", keywords: ["monkey", "hear", "evil"] },
      { emoji: "🙊", name: "speak-no-evil monkey", category: "nature", keywords: ["monkey", "speak", "evil"] },
      { emoji: "🐒", name: "monkey", category: "nature", keywords: ["monkey", "animal"] },
      { emoji: "🐔", name: "chicken", category: "nature", keywords: ["chicken", "bird"] },
      { emoji: "🐧", name: "penguin", category: "nature", keywords: ["penguin", "bird"] },
      { emoji: "🐦", name: "bird", category: "nature", keywords: ["bird", "animal"] },
      { emoji: "🐤", name: "baby chick", category: "nature", keywords: ["chick", "bird", "baby"] },
      { emoji: "🐣", name: "hatching chick", category: "nature", keywords: ["chick", "bird", "hatch"] },
      { emoji: "🐥", name: "front-facing baby chick", category: "nature", keywords: ["chick", "bird", "baby"] },
      { emoji: "🦆", name: "duck", category: "nature", keywords: ["duck", "bird"] },
      { emoji: "🦅", name: "eagle", category: "nature", keywords: ["eagle", "bird"] },
      { emoji: "🦉", name: "owl", category: "nature", keywords: ["owl", "bird", "wise"] },
      { emoji: "🦇", name: "bat", category: "nature", keywords: ["bat", "animal"] },
      { emoji: "🐺", name: "wolf", category: "nature", keywords: ["wolf", "animal"] },
      { emoji: "🐗", name: "boar", category: "nature", keywords: ["boar", "animal"] },
      { emoji: "🐴", name: "horse face", category: "nature", keywords: ["horse", "animal"] },
      { emoji: "🦄", name: "unicorn", category: "nature", keywords: ["unicorn", "magic"] },
      { emoji: "🐝", name: "honeybee", category: "nature", keywords: ["bee", "insect"] },
      { emoji: "🐛", name: "bug", category: "nature", keywords: ["bug", "insect"] },
      { emoji: "🦋", name: "butterfly", category: "nature", keywords: ["butterfly", "insect"] },
      { emoji: "🐌", name: "snail", category: "nature", keywords: ["snail", "slow"] },
      { emoji: "🐞", name: "lady beetle", category: "nature", keywords: ["ladybug", "insect"] },
    ],
  },
  food: {
    name: "Food & Travel",
    icon: MapPin,
    emojis: [
      { emoji: "🍎", name: "red apple", category: "food", keywords: ["apple", "fruit", "red"] },
      { emoji: "🍊", name: "tangerine", category: "food", keywords: ["orange", "fruit"] },
      { emoji: "🍋", name: "lemon", category: "food", keywords: ["lemon", "fruit", "sour"] },
      { emoji: "🍌", name: "banana", category: "food", keywords: ["banana", "fruit"] },
      { emoji: "🍉", name: "watermelon", category: "food", keywords: ["watermelon", "fruit"] },
      { emoji: "🍇", name: "grapes", category: "food", keywords: ["grapes", "fruit"] },
      { emoji: "🍓", name: "strawberry", category: "food", keywords: ["strawberry", "fruit"] },
      { emoji: "🫐", name: "blueberries", category: "food", keywords: ["blueberry", "fruit"] },
      { emoji: "🍈", name: "melon", category: "food", keywords: ["melon", "fruit"] },
      { emoji: "🍒", name: "cherries", category: "food", keywords: ["cherry", "fruit"] },
      { emoji: "🍑", name: "peach", category: "food", keywords: ["peach", "fruit"] },
      { emoji: "🥭", name: "mango", category: "food", keywords: ["mango", "fruit"] },
      { emoji: "🍍", name: "pineapple", category: "food", keywords: ["pineapple", "fruit"] },
      { emoji: "🥥", name: "coconut", category: "food", keywords: ["coconut", "fruit"] },
      { emoji: "🥝", name: "kiwi fruit", category: "food", keywords: ["kiwi", "fruit"] },
      { emoji: "🍅", name: "tomato", category: "food", keywords: ["tomato", "vegetable"] },
      { emoji: "🍆", name: "eggplant", category: "food", keywords: ["eggplant", "vegetable"] },
      { emoji: "🥑", name: "avocado", category: "food", keywords: ["avocado", "fruit"] },
      { emoji: "🥦", name: "broccoli", category: "food", keywords: ["broccoli", "vegetable"] },
      { emoji: "🥕", name: "carrot", category: "food", keywords: ["carrot", "vegetable"] },
      { emoji: "🌽", name: "ear of corn", category: "food", keywords: ["corn", "vegetable"] },
      { emoji: "🌶️", name: "hot pepper", category: "food", keywords: ["pepper", "spicy", "hot"] },
      { emoji: "🫑", name: "bell pepper", category: "food", keywords: ["pepper", "vegetable"] },
      { emoji: "🥒", name: "cucumber", category: "food", keywords: ["cucumber", "vegetable"] },
      { emoji: "🥬", name: "leafy greens", category: "food", keywords: ["lettuce", "vegetable"] },
      { emoji: "🥖", name: "baguette bread", category: "food", keywords: ["bread", "baguette"] },
      { emoji: "🍞", name: "bread", category: "food", keywords: ["bread", "loaf"] },
      { emoji: "🥨", name: "pretzel", category: "food", keywords: ["pretzel", "snack"] },
      { emoji: "🥯", name: "bagel", category: "food", keywords: ["bagel", "bread"] },
      { emoji: "🥞", name: "pancakes", category: "food", keywords: ["pancake", "breakfast"] },
      { emoji: "🧇", name: "waffle", category: "food", keywords: ["waffle", "breakfast"] },
      { emoji: "🧀", name: "cheese wedge", category: "food", keywords: ["cheese", "dairy"] },
      { emoji: "🍖", name: "meat on bone", category: "food", keywords: ["meat", "bone"] },
      { emoji: "🍗", name: "poultry leg", category: "food", keywords: ["chicken", "leg"] },
      { emoji: "🥩", name: "cut of meat", category: "food", keywords: ["meat", "steak"] },
      { emoji: "🥓", name: "bacon", category: "food", keywords: ["bacon", "meat"] },
      { emoji: "🍔", name: "hamburger", category: "food", keywords: ["burger", "hamburger"] },
      { emoji: "🍟", name: "french fries", category: "food", keywords: ["fries", "potato"] },
      { emoji: "🍕", name: "pizza", category: "food", keywords: ["pizza", "slice"] },
      { emoji: "🌭", name: "hot dog", category: "food", keywords: ["hotdog", "sausage"] },
      { emoji: "🥪", name: "sandwich", category: "food", keywords: ["sandwich", "sub"] },
      { emoji: "🌮", name: "taco", category: "food", keywords: ["taco", "mexican"] },
      { emoji: "🌯", name: "burrito", category: "food", keywords: ["burrito", "wrap"] },
      { emoji: "🥙", name: "stuffed flatbread", category: "food", keywords: ["pita", "wrap"] },
      { emoji: "🧆", name: "falafel", category: "food", keywords: ["falafel", "middle eastern"] },
      { emoji: "🥚", name: "egg", category: "food", keywords: ["egg", "protein"] },
      { emoji: "🍳", name: "cooking", category: "food", keywords: ["egg", "frying", "pan"] },
      { emoji: "🥘", name: "shallow pan of food", category: "food", keywords: ["paella", "pan"] },
      { emoji: "🍲", name: "pot of food", category: "food", keywords: ["pot", "stew"] },
      { emoji: "🥗", name: "green salad", category: "food", keywords: ["salad", "healthy"] },
      { emoji: "🍿", name: "popcorn", category: "food", keywords: ["popcorn", "movie"] },
      { emoji: "🧈", name: "butter", category: "food", keywords: ["butter", "dairy"] },
      { emoji: "🧂", name: "salt", category: "food", keywords: ["salt", "seasoning"] },
      { emoji: "🥫", name: "canned food", category: "food", keywords: ["can", "food"] },
      { emoji: "🍱", name: "bento box", category: "food", keywords: ["bento", "japanese"] },
      { emoji: "🍘", name: "rice cracker", category: "food", keywords: ["rice", "cracker"] },
      { emoji: "🍙", name: "rice ball", category: "food", keywords: ["rice", "ball", "onigiri"] },
      { emoji: "🍚", name: "cooked rice", category: "food", keywords: ["rice", "cooked"] },
      { emoji: "🍛", name: "curry rice", category: "food", keywords: ["curry", "rice"] },
      { emoji: "🍜", name: "steaming bowl", category: "food", keywords: ["noodles", "ramen"] },
      { emoji: "🍝", name: "spaghetti", category: "food", keywords: ["pasta", "spaghetti"] },
      { emoji: "🍠", name: "roasted sweet potato", category: "food", keywords: ["potato", "sweet"] },
      { emoji: "🍢", name: "oden", category: "food", keywords: ["oden", "japanese"] },
      { emoji: "🍣", name: "sushi", category: "food", keywords: ["sushi", "japanese"] },
      { emoji: "🍤", name: "fried shrimp", category: "food", keywords: ["shrimp", "fried"] },
      { emoji: "🍥", name: "fish cake with swirl", category: "food", keywords: ["fish", "cake"] },
      { emoji: "🥮", name: "moon cake", category: "food", keywords: ["mooncake", "chinese"] },
      { emoji: "🍡", name: "dango", category: "food", keywords: ["dango", "japanese"] },
      { emoji: "🥟", name: "dumpling", category: "food", keywords: ["dumpling", "gyoza"] },
      { emoji: "🥠", name: "fortune cookie", category: "food", keywords: ["fortune", "cookie"] },
      { emoji: "🥡", name: "takeout box", category: "food", keywords: ["takeout", "chinese"] },
    ],
  },
};

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  children: React.ReactNode;
}

export const EmojiPicker = ({ onEmojiSelect, children }: EmojiPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<EmojiData[]>([]);
  const [activeTab, setActiveTab] = useState("recent");

  // Load recent emojis from localStorage on mount
  useEffect(() => {
    const storedRecent = localStorage.getItem("recentEmojis");
    if (storedRecent) {
      try {
        const recent = JSON.parse(storedRecent);
        setRecentEmojis(recent);
        emojiCategories.recent.emojis = recent;
      } catch (e) {
        console.error("Failed to parse recent emojis:", e);
      }
    }
  }, []);

  // Save recent emojis to localStorage
  const saveRecentEmojis = (emojis: EmojiData[]) => {
    localStorage.setItem("recentEmojis", JSON.stringify(emojis));
  };

  // Handle emoji selection
  const handleEmojiSelect = (emojiData: EmojiData) => {
    onEmojiSelect(emojiData.emoji);
    
    // Add to recent emojis
    const updatedRecent = [
      emojiData,
      ...recentEmojis.filter(e => e.emoji !== emojiData.emoji)
    ].slice(0, 20); // Keep only last 20 recent emojis
    
    setRecentEmojis(updatedRecent);
    emojiCategories.recent.emojis = updatedRecent;
    saveRecentEmojis(updatedRecent);
  };

  // Filter emojis based on search query
  const getFilteredEmojis = (emojis: EmojiData[]) => {
    if (!searchQuery.trim()) return emojis;
    
    const query = searchQuery.toLowerCase();
    return emojis.filter(emoji => 
      emoji.name.toLowerCase().includes(query) ||
      emoji.keywords?.some(keyword => keyword.toLowerCase().includes(query))
    );
  };

  // Get all emojis for search across categories
  const getAllEmojis = () => {
    return Object.values(emojiCategories)
      .filter(category => category.name !== "Recent")
      .flatMap(category => category.emojis);
  };

  // Determine which emojis to show
  const emojisToShow = searchQuery.trim() 
    ? getFilteredEmojis(getAllEmojis())
    : emojiCategories[activeTab as keyof typeof emojiCategories]?.emojis || [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        side="top"
        sideOffset={8}
      >
        <div className="flex flex-col h-96">
          {/* Search Header */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search emojis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* Category Tabs */}
          {!searchQuery.trim() && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList className="grid w-full grid-cols-7 h-10 bg-gray-50">
                {Object.entries(emojiCategories).map(([key, category]) => {
                  const Icon = category.icon;
                  return (
                    <TabsTrigger 
                      key={key} 
                      value={key}
                      className="p-1 data-[state=active]:bg-white"
                      disabled={key === "recent" && recentEmojis.length === 0}
                    >
                      <Icon className="h-4 w-4" />
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {Object.keys(emojiCategories).map((key) => (
                <TabsContent key={key} value={key} className="flex-1 m-0">
                  <ScrollArea className="h-80">
                    <div className="grid grid-cols-8 gap-1 p-2">
                      {emojiCategories[key as keyof typeof emojiCategories].emojis.map((emoji, index) => (
                        <Button
                          key={`${emoji.emoji}-${index}`}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-100 text-lg"
                          onClick={() => handleEmojiSelect(emoji)}
                          title={emoji.name}
                        >
                          {emoji.emoji}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          )}

          {/* Search Results */}
          {searchQuery.trim() && (
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-8 gap-1 p-2">
                {emojisToShow.length > 0 ? (
                  emojisToShow.map((emoji, index) => (
                    <Button
                      key={`${emoji.emoji}-${index}`}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-100 text-lg"
                      onClick={() => handleEmojiSelect(emoji)}
                      title={emoji.name}
                    >
                      {emoji.emoji}
                    </Button>
                  ))
                ) : (
                  <div className="col-span-8 flex items-center justify-center py-8 text-gray-500 text-sm">
                    No emojis found
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};