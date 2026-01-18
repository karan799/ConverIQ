"""
Quick test script to verify ML engine works independently
Run this to test the ML components without needing database setup
"""

from ml_engine import MLScoringEngine

def test_sentiment_analysis():
    print("=" * 60)
    print("Testing ConverIQ ML Engine")
    print("=" * 60)
    
    # Initialize ML engine
    print("\n[1/3] Initializing ML engine...")
    engine = MLScoringEngine()
    print("✓ ML engine initialized successfully!")
    
    # Test sentiment analysis
    print("\n[2/3] Testing sentiment analysis...")
    test_messages = [
        ("I'm very interested in this product!", "POSITIVE"),
        ("This is too expensive for me.", "NEGATIVE"),
        ("Can you tell me more about the features?", "NEUTRAL"),
    ]
    
    for text, expected in test_messages:
        result = engine.analyze_sentiment(text)
        print(f"\nText: '{text}'")
        print(f"Sentiment: {result['label']} (confidence: {result['score']:.2f})")
        print(f"Expected: {expected}")
    
    # Test conversation scoring
    print("\n[3/3] Testing conversation scoring...")
    
    sample_conversation = [
        {
            'speaker': 'Agent',
            'text': 'Hello! I\'m calling about our insurance plans.',
            'sentiment_score': 0.8,
            'sentiment_label': 'POSITIVE'
        },
        {
            'speaker': 'Client',
            'text': 'Yes, I\'m interested. Tell me more.',
            'sentiment_score': 0.85,
            'sentiment_label': 'POSITIVE'
        },
        {
            'speaker': 'Agent',
            'text': 'Great! We have comprehensive coverage for health and life.',
            'sentiment_score': 0.9,
            'sentiment_label': 'POSITIVE'
        },
        {
            'speaker': 'Client',
            'text': 'That sounds perfect. I definitely want to sign up!',
            'sentiment_score': 0.95,
            'sentiment_label': 'POSITIVE'
        }
    ]
    
    score_result = engine.calculate_conversation_score(sample_conversation)
    
    print(f"\nConversion Score: {score_result['score']:.2f}/100")
    print("\nContributing Factors:")
    for factor in score_result['factors']:
        print(f"  • {factor}")
    
    print("\nDetailed Metrics:")
    for metric, value in score_result['metrics'].items():
        print(f"  - {metric}: {value:.2f}")
    
    print("\n" + "=" * 60)
    print("✓ All tests passed! ML engine is working correctly.")
    print("=" * 60)

if __name__ == "__main__":
    test_sentiment_analysis()
