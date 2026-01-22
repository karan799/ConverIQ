from ml_engine import MLScoringEngine

def test_scoring():
    engine = MLScoringEngine()
    history = []
    
    print("Testing ML Scoring Engine...")
    
    # TC1: Neutral start
    print("\n--- TC1: Neutral Start ---")
    result = engine.process_message("Hello, how are you?", "Client", history)
    history.append(result['message'])
    print(f"Score: {result['conversation_score']} (Expected: low/neutral)")
    
    # TC2: Strong buying signal
    print("\n--- TC2: Buying Signal ---")
    result = engine.process_message("I want to buy this policy immediately. Can I make a payment?", "Client", history)
    history.append(result['message'])
    print(f"Score: {result['conversation_score']} (Expected: high boost due to 'buy', 'payment')")
    print("Factors:", [f['label'] for f in result['factors']])
    
    # TC3: Objection
    print("\n--- TC3: Objection ---")
    result = engine.process_message("But the premium is too expensive.", "Client", history)
    history.append(result['message'])
    print(f"Score: {result['conversation_score']} (Expected: drop)")
    
    # TC4: Recovery (Positive sentiment overriding objection)
    print("\n--- TC4: Recovery ---")
    result = engine.process_message("Actually it's fine, I like the benefits. Proceed.", "Client", history)
    history.append(result['message'])
    print(f"Score: {result['conversation_score']} (Expected: recovery)")
    print("Factors:", [f['label'] for f in result['factors']])

if __name__ == "__main__":
    test_scoring()
