# import json
import numpy as np
from transformers import pipeline
# from datetime import datetime
# import re

class MLScoringEngine:
    def __init__(self):
        """Initialize ML models for sentiment analysis and scoring"""
        print("Loading sentiment analysis model...")
        try:
            # Use multilingual model that supports Hindi, English, and Hinglish
            self.sentiment_analyzer = pipeline(
                "text-classification",
                model="tabularisai/multilingual-sentiment-analysis"
            )
        except Exception as e:
            print(f"Warning: Failed to load sentiment model: {e}")
            print("Using fallback: keyword-based sentiment analysis only")
            self.sentiment_analyzer = None
        
        # Buying signal keywords
        self.positive_signals = [
            'interested', 'yes', 'sounds good', 'tell me more', 'how much',
            'when can', 'sign up', 'enroll', 'proceed', 'agree', 'perfect',
            'excellent', 'great', 'definitely', 'absolutely', 'looking for',
            'need', 'want', 'budget', 'approved', 'ready', 'timeline',
             "yes, let's proceed", "i want to buy", "ready to purchase",
            "send me the form", "when can i start", "let's finalize",
            "i'll take it", "sign me up", "go ahead", "confirm this",
            "book this policy", "start the process", "i agree",
            "haan theek hai proceed karo", "main lena chahta hoon", 
            "chaliye shuru karte hain", "form bhej do", 
            "kab se start hoga", "theek hai pakka kar do",
            "haan le lunga", "apply kar do", "ok done",
            "chalo confirm karte hain", "policy book karo",
            "process start karo", "haan mujhe chahiye",
            "what's the price", "how much premium", "what's the cost",
            "monthly payment kitna", "emi options", "premium calculator",
            "discount available", "total amount", "payment options",
            "can i afford", "budget mein hai", "quote send karo",
            "proposal share karo", "brochure chahiye",
            "kitna paisa lagega", "premium kitna hoga", "cost kya hai",
            "mahine ka kitna dena hoga", "emi mein mil sakta hai",
            "discount milega kya", "total kitna hai", 
            "payment kaise karni hai", "mere budget mein aayega",
            "quotation bhejo", "details email karo",
            "policy paper dikhao", "premium batao",
            "tell me more", "what are the benefits", "coverage details",
            "compare plans", "other options", "difference between",
            "which is better", "recommend karo", "suitable plan",
            "explain the features", "sum assured", "claim process",
            "aur batao", "kya fayda hai", "coverage kya milega",
            "plan compare karo", "dusre option kya hain",
            "difference kya hai", "kaun sa better hai",
            "suggest karo", "mere liye suitable kya hai",
            "features explain karo", "claim kaise hota hai",
            "maturity pe kitna milega",
            "just asking", "want to know", "curious about",
            "heard about", "someone told me", "researching",
            "looking at options", "exploring", "considering",
            "thinking about", "maybe interested",
            "bas puchh raha tha", "jaanna chahta hoon", 
            "dekh raha hoon", "suna hai maine", "kisi ne bola",
            "research kar raha hoon", "options dekh raha hoon",
            "socha hai", "dekhta hoon", "shayad lunga",
            "new baby", "just married", "bought house", "new car",
            "joined new company", "got promotion", "retirement planning",
            "child's education", "daughter's wedding", "health issue",
            "parent's age", "family responsibility",
            "bachha hua hai", "shaadi ho gayi", "ghar liya hai",
            "nayi gaadi li", "naukri mili hai", "promotion mila",
            "retirement ke liye", "bachhe ki padhai", 
            "beti ki shaadi", "health problem hai",
            "maa baap bade ho gaye", "family ki zimmedari",
            "makes sense", "good information", "understood", 
            "interesting", "helpful", "thank you", "appreciated",
            "clear explanation", "got it", "i see", "samajh aa gaya", "achha hai", "theek hai",
            "interesting hai", "helpful hai", "shukriya",
            "achhe se samjhaya", "clear hai", "haan haan",
            "हाँ", "हाँ बिल्कुल", "हाँ ठीक है", "हाँ कर दीजिए",
            "मुझे चाहिए", "मैं लेना चाहता हूँ", "मैं ले लूँगा",
            "पक्का कर दीजिए", "बुक कर दीजिए", "शुरू कर दीजिए",
            "प्रोसेस शुरू करें", "फॉर्म भेज दीजिए",
            "मैं सहमत हूँ", "ठीक है आगे बढ़िए","कीमत क्या है", "प्रीमियम कितना है", "कितना खर्च आएगा",
            "मासिक भुगतान कितना होगा", "ईएमआई में मिलेगा",
            "क्या यह मेरे बजट में है", "कोटेशन भेजिए",
            "पूरा अमाउंट कितना है", "पेमेंट कैसे करनी है",
            "और बताइए", "डिटेल्स बताइए", "फायदे क्या हैं",
            "कवरेज क्या मिलेगा", "कौन सा बेहतर है",
            "मेरे लिए कौन सा सही रहेगा", "कृपया समझाइए",
            "फीचर्स बताइए", "क्लेम कैसे होता है",
            "समझ आ गया", "ठीक है", "अच्छा है", "जानकारी अच्छी है",
            "मदद मिली", "धन्यवाद", "सही बताया",
            "अब क्लियर है", "यह ठीक लग रहा है",
        ]
        
        self.negative_signals = [
            'not interested', 'no thanks', 'maybe later', 'thinking',
            'expensive', 'too much', 'cant afford', 'busy', 'not now',
            'call back', 'not sure', 'hesitant', 'doubt', 'concern',"not interested", "no thanks", "don't call again",
            "not needed", "waste of time", "already have",
            "not for me", "too expensive", "can't afford",
            "remove my number", "stop calling", "busy hai",
            "interest nahi hai", "nahi chahiye", "mat call karo",
            "zarurat nahi", "time waste hai", "pehle se hai",
            "mere liye nahi", "bahut mehenga", "afford nahi kar sakta",
            "number hata do", "call band karo", "busy hoon","let me think", "call later", "not right now",
            "next month", "after salary", "discuss with family",
            "wife se poochna hai", "boss se baat karunga",
            "not sure", "confused", "many options","sochta hoon", "baad mein call karo", "abhi nahi",
            "next month", "salary ke baad", "family se puchhunga",
            "biwi se baat karunga", "decide nahi kar paya",
            "confusion hai", "bahut option hain", "samajh nahi aaya","lic already", "hdfc policy hai", "icici mein hai",
            "max life se liya", "sbi mein invested", "bajaj policy",
            "current provider", "already covered", "renew existing","lic se liya hai", "hdfc mein hai pehle se",
            "icici wala hai", "max life se policy hai",
            "already cover hai", "existing policy renew karunga",
            "dusri company se hai", "insurance hai pehle se","too costly", "reduce premium", "cheaper plan",
            "discount milega", "offer hai kya", "lower price",
            "budget se zyada", "affordable option", "emi reduce karo","bahut mehenga hai", "premium kam karo", 
            "sasta plan hai kya", "discount do", "offer laga do",
            "price kam karo", "budget se bahar hai",
            "affordable chahiye", "monthly kam karo",
            "मुझे नहीं चाहिए", "कोई रुचि नहीं है", "इंटरेस्ट नहीं है",
            "अभी नहीं चाहिए", "बिल्कुल नहीं", "मना है",
            "कॉल मत कीजिए", "दोबारा कॉल मत कीजिए",
            "नंबर हटा दीजिए", "समय बर्बाद है",
            "बाद में बात करेंगे", "अभी समय नहीं है",
            "फिर कभी", "अगले महीने", "सैलरी के बाद",
            "अभी कॉल मत कीजिए", "बाद में कॉल कीजिए",
            "बहुत महंगा है", "मेरे बजट से बाहर है",
            "अफोर्ड नहीं कर सकता", "प्रीमियम ज्यादा है",
            "सस्ता विकल्प चाहिए", "कम कीमत में मिलेगा क्या",
            "ईएमआई कम करनी होगी",
            "पहले से है", "पहले से पॉलिसी है",
            "दूसरी कंपनी से लिया है",
            "अभी जरूरत नहीं है",
            "कवर्ड हूँ पहले से",
            "सोचना पड़ेगा", "कन्फ्यूजन है",
            "समझ नहीं आया", "डिसाइड नहीं कर पाया",
            "घरवालों से पूछना होगा",
            "बीवी से बात करनी है",
            "फैमिली से डिस्कस करना है",
            "ठीक है देखते हैं", "अभी नहीं",
            "ज्यादा जानकारी नहीं चाहिए",
            "बस पूछ रहा था",
            "अभी मन नहीं है",
        ]
        
        self.urgency_signals = [
        'asap', 'urgent', 'soon', 'immediately', 'today', 'right now',
        'quickly', 'fast', 'emergency', 'need it now',"urgent need", "immediately", "right now", "today itself",
        "asap", "this week", "by tomorrow", "before deadline",
        "policy expiring", "need cover fast", "emergency situation","turant chahiye", "abhi chahiye", "aaj hi karna hai",
        "jaldi hai", "is hafte mein", "kal tak", 
        "policy khatam ho rahi hai", "emergency hai",
        "jaldi cover chahiye", "time nahi hai",
        "तुरंत चाहिए", "अभी चाहिए", "अभी ही चाहिए",
        "आज ही करना है", "आज ही चाहिए",
        "फौरन चाहिए", "तुरंत करना होगा",
        "जल्दी है", "बहुत जल्दी है",
        "आज तक", "कल तक",
        "इस हफ्ते", "इस सप्ताह",
        "डेडलाइन है", "समय कम है",
        "इमरजेंसी है",
        "बहुत जरूरी है",
        "अचानक जरूरत पड़ गई",
        "स्थिति गंभीर है",
        ]


        # Decision maker signals (Head of family / independent buyer)
        self.decision_maker_signals = [
        "i decide", "my choice", "i'll handle", "i manage finances",
        "no need to ask", "i'm authorized", "my decision",
        "i control money", "independent decision",
        "main decide karunga", "meri marzi", "main sambhalata hoon",
        "paise main handle karta hoon", "kisi se nahi poochna",
        "mera decision hai", "main hi dekhunga", "authority meri hai",
        "मैं फैसला करूँगा", "फैसला मेरा है",
        "मैं ही तय करूँगा", "अंतिम फैसला मेरा है",
        "मेरी ही मर्जी चलेगी", "मैं खुद निर्णय लूँगा",
        "पैसे मैं संभालता हूँ",
        "फाइनेंस मैं देखता हूँ",
        "बजट मैं तय करता हूँ",
        "पेमेंट मैं करूँगा",
        "पैसे का निर्णय मेरा है",
        "किसी से पूछने की जरूरत नहीं",
        "मुझे किसी की अनुमति नहीं चाहिए",
        "मैं खुद डिसाइड करता हूँ",
        "मुझे किसी से सलाह नहीं लेनी",
        "घर का फैसला मैं करता हूँ",
        "परिवार की जिम्मेदारी मेरी है",
        "मैं परिवार का मुखिया हूँ",
        "घर के फैसले मैं ही लेता हूँ",
        "मैं ही देख लूँगा",
        "मैं खुद संभाल लूँगा",
        "आप मुझसे ही बात कीजिए",
        "मुझसे कन्फर्म कर लीजिए",
        ]

        
        print("ML Engine initialized successfully!")
    
    def analyze_sentiment(self, text):
        """Analyze sentiment of a text message"""
        if not text or len(text.strip()) < 3:
            return {'label': 'NEUTRAL', 'score': 0.5}
        
        try:
            if self.sentiment_analyzer is None:
                # Fallback to keyword-based analysis
                return self._keyword_based_sentiment(text)
            
            result = self.sentiment_analyzer(text[:512])[0]  # Limit to 512 chars
            
            # Convert model output (Very Negative, Negative, Neutral, Positive, Very Positive)
            # to standard format (NEGATIVE, NEUTRAL, POSITIVE)
            label = result.get('label', 'Neutral')
            score = result.get('score', 0.5)
            
            # Map to binary/ternary sentiment
            if 'Very Positive' in label or 'Positive' in label:
                return {'label': 'POSITIVE', 'score': score}
            elif 'Very Negative' in label or 'Negative' in label:
                return {'label': 'NEGATIVE', 'score': score}
            else:
                return {'label': 'NEUTRAL', 'score': 0.5}
        except Exception as e:
            print(f"Sentiment analysis error: {e}")
            # Fallback to keyword-based analysis
            return self._keyword_based_sentiment(text)
    
    def _keyword_based_sentiment(self, text):
        """Fallback keyword-based sentiment analysis"""
        text_lower = text.lower()
        signals = self.extract_buying_signals(text_lower)
        
        positive_count = signals['positive_signals']
        negative_count = signals['negative_signals']
        
        if positive_count > negative_count:
            score = min(0.5 + (positive_count * 0.1), 1.0)
            return {'label': 'POSITIVE', 'score': score}
        elif negative_count > positive_count:
            score = min(negative_count * 0.1, 1.0)
            return {'label': 'NEGATIVE', 'score': score}
        else:
            return {'label': 'NEUTRAL', 'score': 0.5}
    
    
    
    # this is for deciding if the client is the owner 
    def detect_decision_maker(self, text):
        text_lower = text.lower()
        found = [p for p in self.decision_maker_signals if p in text_lower]

        return {
            "count": len(found),
            "keywords": found
        }


    
    def extract_buying_signals(self, text):
        """Extract buying signals from text with evidence"""
        text_lower = text.lower()
        
        # Track which signals were found with evidence
        positive_found = [signal for signal in self.positive_signals if signal in text_lower]
        negative_found = [signal for signal in self.negative_signals if signal in text_lower]
        urgency_found = [signal for signal in self.urgency_signals if signal in text_lower]
        
        return {
            'positive_signals': len(positive_found),
            'negative_signals': len(negative_found),
            'urgency_signals': len(urgency_found),
            'positive_keywords': positive_found,
            'negative_keywords': negative_found,
            'urgency_keywords': urgency_found
        }
    
    def calculate_conversation_score(self, messages, conversation_metadata=None):
        """
        Calculate real-time conversion score based on conversation
        
        Args:
            messages: List of message dicts with 'speaker', 'text', 'sentiment_score'
            conversation_metadata: Optional metadata about the conversation
        
        Returns:
            dict with score and contributing factors
        """
        if not messages:
            return {'score': 0, 'factors': []}
        
        # Initialize metrics
        customer_messages = [m for m in messages if m.get('speaker') == 'Client']
        agent_messages = [m for m in messages if m.get('speaker') == 'Agent']
        
        if not customer_messages:
            return {'score': 30, 'factors': ['Waiting for customer response']}
        
        # 1. Sentiment Analysis (30% weight)
        customer_sentiments = []
        for msg in customer_messages:
            if 'sentiment_score' in msg:
                sentiment = msg['sentiment_score']
                # Convert to 0-1 scale (assuming sentiment is already 0-1)
                customer_sentiments.append(sentiment)
        
        avg_sentiment = np.mean(customer_sentiments) if customer_sentiments else 0.5
        sentiment_score = avg_sentiment * 30
        
        # 2. Buying Signals (35% weight)
        all_customer_text = ' '.join([m.get('text', '') for m in customer_messages])
        signals = self.extract_buying_signals(all_customer_text)
        
        positive_score = min(len(set(signals['positive_keywords'])) * 3, 20)
        negative_penalty = min(len(set(signals['negative_keywords'])) * 3, 10)
        urgency_score = min(len(set(signals['urgency_keywords'])) * 10, 10)

        
        buying_signal_score = max(0, positive_score + urgency_score - negative_penalty)
        
        # 3. Engagement Level (20% weight)
        meaningful_msgs = [m for m in customer_messages if len(m.get('text', '')) > 10]
        message_count_score = min(len(meaningful_msgs) * 3, 20)

        
        # 4. Response Quality (15% weight)
        avg_customer_msg_length = np.mean([len(m.get('text', '')) for m in customer_messages])
        avg_len = min(avg_customer_msg_length, 200)
        response_quality = (avg_len / 200) * 15

        # 2.5 Decision Maker Boost

        decision_data = self.detect_decision_maker(all_customer_text)

        decision_score = min(
            len(set(decision_data["keywords"])) * 4,
            12
        )

        
        # Calculate total score (0-100)
        total_score = sentiment_score + buying_signal_score + message_count_score + response_quality + decision_score
        total_score = max(0, min(100, total_score))  # Clamp between 0-100
        
        # Determine contributing factors with detailed evidence
        factors = []
        
        if avg_sentiment > 0.6:
            factors.append({
                'type': 'sentiment',
                'label': f"Positive sentiment ({avg_sentiment:.2f})",
                'evidence': 'Customer responses show positive tone and language',
                'score': avg_sentiment
            })
        elif avg_sentiment < 0.4:
            factors.append({
                'type': 'sentiment',
                'label': f"Negative sentiment ({avg_sentiment:.2f})",
                'evidence': 'Customer responses show negative or hesitant tone',
                'score': avg_sentiment
            })
        
        if signals['positive_signals'] > 0:
            keywords_str = ', '.join([f'"{kw}"' for kw in signals['positive_keywords'][:5]])  # Show first 5
            factors.append({
                'type': 'buying_signals',
                'label': f"{signals['positive_signals']} buying signals detected",
                'evidence': f"Keywords found: {keywords_str}",
                'keywords': signals['positive_keywords']
            })
        
        if signals['urgency_signals'] > 0:
            keywords_str = ', '.join([f'"{kw}"' for kw in signals['urgency_keywords']])
            factors.append({
                'type': 'urgency',
                'label': "Urgency indicators present",
                'evidence': f"Urgency keywords detected: {keywords_str}",
                'keywords': signals['urgency_keywords']
            })

        if decision_data["count"] > 0:
            factors.append({
                "type": "decision_maker",
                "label": "Decision authority detected",
                "evidence": f"Phrases found: {decision_data['keywords']}",
                "count": decision_data["count"]
            })

        
        if signals['negative_signals'] > 2:
            keywords_str = ', '.join([f'"{kw}"' for kw in signals['negative_keywords'][:5]])
            factors.append({
                'type': 'objections',
                'label': f"Multiple objections detected",
                'evidence': f"Objection keywords found: {keywords_str}",
                'keywords': signals['negative_keywords']
            })
        
        if len(customer_messages) > 5:
            factors.append({
                'type': 'engagement',
                'label': "High engagement level",
                'evidence': f"Customer sent {len(customer_messages)} messages showing active participation",
                'message_count': len(customer_messages)
            })
        
        if not factors:
            factors.append({
                'type': 'early_stage',
                'label': "Conversation in early stage",
                'evidence': 'Not enough data to determine clear buying intent yet',
                'message_count': len(customer_messages)
            })
        
        return {
            'score': round(total_score, 2),
            'factors': factors,
            'metrics': {
                'sentiment_score': round(sentiment_score, 2),
                'buying_signal_score': round(buying_signal_score, 2),
                'engagement_score': round(message_count_score, 2),
                'response_quality': round(response_quality, 2)
            }
        }
    
    def process_message(self, text, speaker, conversation_history):
        """
        Process a single message and return sentiment + updated score
        
        Args:
            text: Message text
            speaker: 'Agent' or 'Client'
            conversation_history: List of previous messages
        
        Returns:
            dict with sentiment and updated conversation score
        """
        # Analyze sentiment
        sentiment_result = self.analyze_sentiment(text)
        
        # Convert sentiment label to score (0-1 scale)
        if sentiment_result['label'] == 'POSITIVE':
            sentiment_score = sentiment_result['score']
        elif sentiment_result['label'] == 'NEGATIVE':
            sentiment_score = 1 - sentiment_result['score']
        else:  # NEUTRAL
            sentiment_score = 0.5

        
        # Create message object
        message_obj = {
            'speaker': speaker,
            'text': text,
            'sentiment_score': sentiment_score,
            'sentiment_label': sentiment_result['label']
        }
        
        # Add to conversation history
        updated_history = conversation_history + [message_obj]
        
        # Calculate updated conversation score
        score_result = self.calculate_conversation_score(updated_history)
        
        return {
            'message': message_obj,
            'conversation_score': score_result['score'],
            'factors': score_result['factors'],
            'metrics': score_result.get('metrics', {})
        }