#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Setup rapide — Prof en Ligne Virtual Company
# ═══════════════════════════════════════════════════════════════

echo "🏢 Installation de Prof en Ligne Virtual Company..."
echo ""

# 1. Venv Python
if [ ! -d "venv" ]; then
    echo "📦 Création de l'environnement virtuel..."
    python3 -m venv venv
fi

source venv/bin/activate

# 2. Dépendances
echo "📦 Installation des dépendances..."
pip install -r requirements.txt --quiet

# 3. Config
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT : Ajoute ta clé API Anthropic dans agents/.env"
    echo "   → Ouvre le fichier : nano .env"
    echo "   → Remplace sk-ant-api03-xxx par ta vraie clé"
    echo "   → Crée ta clé sur : https://console.anthropic.com/settings/keys"
    echo ""
fi

echo "✅ Installation terminée !"
echo ""
echo "Usage :"
echo "  source venv/bin/activate"
echo "  python crew.py audit"
echo "  python crew.py sprint"
echo "  python crew.py launch"
echo "  python crew.py feature \"chat temps réel élève-prof\""
echo ""
