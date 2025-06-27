import unittest
from utils.text_cleaning import remove_emojis

class TestRemoveEmojis(unittest.TestCase):
    def test_basic_removal(self):
        self.assertEqual(remove_emojis("Hello 😃!"), "Hello !")
        self.assertEqual(remove_emojis("Pas d'emoji ici."), "Pas d'emoji ici.")

    def test_multilang(self):
        self.assertEqual(remove_emojis("Bonjour 👋, ça va ?"), "Bonjour , ça va ?")
        self.assertEqual(remove_emojis("مرحبا 🌙"), "مرحبا ")
        self.assertEqual(remove_emojis("你好 🐉"), "你好 ")
        self.assertEqual(remove_emojis("Привет 🚀"), "Привет ")

    def test_edge_cases(self):
        # Emojis combinés, modificateurs, ZWJ
        self.assertEqual(remove_emojis("👩🏽‍💻 développeuse"), " développeuse")
        self.assertEqual(remove_emojis("👨‍⚕️ médecin"), " médecin")
        self.assertEqual(remove_emojis("👨‍👩‍👧‍👦 famille"), " famille")
        self.assertEqual(remove_emojis("🏳️‍🌈 drapeau"), " drapeau")
        self.assertEqual(remove_emojis("👩‍🔬 scientifique"), " scientifique")
        self.assertEqual(remove_emojis("👩‍🚒 pompier"), " pompier")
        self.assertEqual(remove_emojis("👩‍🎤 artiste"), " artiste")
        self.assertEqual(remove_emojis("👩‍❤️‍👨 couple"), " couple")
        self.assertEqual(remove_emojis("👩‍👧‍👦 famille"), " famille")
        self.assertEqual(remove_emojis("👩🏾‍🤝‍👩🏼 amies"), " amies")
        # ZWJ isolé ne doit pas être supprimé
        self.assertEqual(remove_emojis("mot00dcle"), "mot00dcle")

    def test_performance(self):
        long_text = "A" * 10000 + "😃" + "B" * 10000
        self.assertEqual(remove_emojis(long_text), "A" * 10000 + "B" * 10000)

    def test_non_regression(self):
        # Aucun symbole non-emoji ne doit être supprimé
        self.assertEqual(remove_emojis("™ ∑ ∞ ≈ ≠ ≤ ≥"), "™ ∑ ∞ ≈ ≠ ≤ ≥")
        self.assertEqual(remove_emojis("text 123 !@#"), "text 123 !@#")

if __name__ == "__main__":
    unittest.main() 