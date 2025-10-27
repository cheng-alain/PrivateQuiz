#!/usr/bin/env python3
"""
Script pour ajouter le champ 'difficulty' aux questions Kubernetes.
Ce script lit le fichier kubernetes.json et ajoute automatiquement
le champ difficulty à chaque question.

Usage:
    python3 add_difficulty.py
"""

import json

def add_difficulty_to_questions():
    # Lire le fichier kubernetes.json
    with open('themes/kubernetes.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    questions = data.get('questions', [])
    total_questions = len(questions)

    print(f"Total questions trouvées: {total_questions}")

    # Calculer combien de questions par difficulté (50 chacune)
    questions_per_difficulty = 50

    # Assigner les difficultés
    for i, question in enumerate(questions):
        if i < questions_per_difficulty:
            question['difficulty'] = 'easy'
        elif i < questions_per_difficulty * 2:
            question['difficulty'] = 'intermediate'
        elif i < questions_per_difficulty * 3:
            question['difficulty'] = 'advanced'
        else:
            # Si il y a plus de 150 questions, les mettre en advanced
            question['difficulty'] = 'advanced'

    # Compter les questions par difficulté
    easy_count = sum(1 for q in questions if q.get('difficulty') == 'easy')
    intermediate_count = sum(1 for q in questions if q.get('difficulty') == 'intermediate')
    advanced_count = sum(1 for q in questions if q.get('difficulty') == 'advanced')

    print(f"\nRépartition des difficultés:")
    print(f"  - Facile: {easy_count} questions")
    print(f"  - Moyen: {intermediate_count} questions")
    print(f"  - Difficile: {advanced_count} questions")

    # Sauvegarder le fichier
    with open('themes/kubernetes.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

    print(f"\n✓ Fichier mis à jour avec succès!")
    print(f"✓ Total: {len(questions)} questions")

if __name__ == '__main__':
    try:
        add_difficulty_to_questions()
    except FileNotFoundError:
        print("❌ Erreur: Le fichier themes/kubernetes.json n'a pas été trouvé")
    except Exception as e:
        print(f"❌ Erreur: {e}")
