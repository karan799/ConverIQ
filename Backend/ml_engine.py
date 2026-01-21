"""
ML Scoring Engine for ConverIQ
Real-time sentiment analysis and lead conversion scoring
Optimized for Indian Insurance Sales Conversations
"""

import numpy as np
from transformers import pipeline
import socket


class MLScoringEngine:
    """
    ML Scoring Engine optimized for Indian Insurance Sales Conversations
    Supports English, Hindi, and Hinglish (mixed language)
    """
    
    def __init__(self):
        """Initialize ML models for sentiment analysis and scoring"""
        try:
            # Check connectivity first to fail fast if offline
            print("  Checking connectivity to Hugging Face...")
            socket.create_connection(("huggingface.co", 443), timeout=3)

            # Use multilingual model that supports Hindi, English, and Hinglish
            self.sentiment_analyzer = pipeline(
                "text-classification",
                model="tabularisai/multilingual-sentiment-analysis"
            )
        except Exception as e:
            print(f"  Warning: Could not connect to Hugging Face or load model. Running in offline mode. Error: {e}")
            self.sentiment_analyzer = None
        
        # ==========================================
        # INDIAN INSURANCE - POSITIVE BUYING SIGNALS
        # ==========================================
        self.positive_signals = [
            # === STRONG BUYING INTENT ===
            "yes proceed", "haan karo", "book karo", "policy le lunga",
            "premium bharna hai", "sign up", "apply karo", "form bhejo",
            "documents ready hai", "medical karwa lunga", "nominee kaun",
            "beneficiary add karo", "start the policy", "activate karo",
            "payment kar deta hoon", "cheque de deta hoon", "online payment",
            "emi start karo", "auto debit laga do", "nach mandate sign",
            
            # === INSURANCE PRODUCT INTEREST ===
            # Term Insurance
            "term insurance", "term plan", "pure protection", "life cover",
            "sum assured kitna", "death benefit", "term kitne saal ka",
            "1 crore cover", "50 lakh policy", "premium waiver",
            
            # Endowment & Traditional
            "endowment plan", "money back", "guaranteed returns",
            "maturity benefit", "survival benefit", "bonus kya milega",
            "participating policy", "non participating", "traditional plan",
            
            # ULIP
            "ulip plan", "market linked", "fund options", "nav kya hai",
            "equity fund", "debt fund", "balanced fund", "switch karna hai",
            "partial withdrawal", "top up premium",
            
            # Health Insurance
            "health insurance", "mediclaim", "hospitalization cover",
            "cashless hospital", "network hospital", "room rent limit",
            "no claim bonus", "pre existing disease", "waiting period",
            "family floater", "individual health", "critical illness",
            "super top up", "corona cover", "daycare procedure",
            
            # Motor Insurance
            "car insurance", "bike insurance", "motor policy",
            "comprehensive cover", "third party", "own damage",
            "zero depreciation", "roadside assistance", "ncb transfer",
            "idv value", "add on covers",
            
            # === TAX BENEFITS (Strong buying signal) ===
            "80c benefit", "80d deduction", "tax saving", "tax free",
            "section 80c", "section 80d", "section 10(10d)",
            "tax exemption", "income tax benefit", "tax bachana hai",
            "tax planning", "80c limit", "1.5 lakh deduction",
            
            # === PRICE INQUIRY (Shows serious interest) ===
            "premium kitna", "monthly kitna", "yearly premium",
            "one time payment", "single premium", "limited pay",
            "5 year pay", "10 year pay", "regular premium",
            "affordable hai kya", "budget mein hai", "emi available",
            "discount milega", "online discount", "rate kam karo",
            
            # === COMPARISON (Active evaluation) ===
            "compare karo", "lic se compare", "hdfc vs icici",
            "max life kaisa hai", "sbi life better hai",
            "bajaj allianz", "tata aia", "kotak life",
            "claim settlement ratio", "csr kitna hai", "irda rating",
            "which company better", "best plan kaun sa",
            
            # === LIFE EVENTS (Strong purchase triggers) ===
            "shaadi ho gayi", "baby aa gaya", "bachha hua hai",
            "ghar liya", "home loan liya", "car loan hai",
            "naukri lagi", "salary badhi", "promotion mila",
            "business start kiya", "retirement planning",
            "bachhe ki padhai", "daughter wedding", "beti ki shaadi",
            
            # === FAMILY PROTECTION ===
            "family ke liye", "wife ke naam", "bachon ke liye",
            "parents cover", "dependent hai", "sole earner",
            "akela kamata hoon", "family security", "future secure",
            
            # === POSITIVE RESPONSES ===
            "haan theek hai", "bilkul sahi", "achha plan hai",
            "pasand aaya", "interesting hai", "makes sense",
            "samajh aa gaya", "clear hai", "aur batao",
            "detail mein batao", "brochure bhejo", "email karo",
            "whatsapp karo", "meeting fix karo", "ghar aa jao",
            "office aa jaunga", "kal baat karte hain", "time batao",
            
            # === HINDI POSITIVE ===
            "हाँ", "हाँ चाहिए", "ले लेता हूँ", "कर दीजिए",
            "प्रीमियम भर दूंगा", "पॉलिसी ले लूंगा", "शुरू कीजिए",
            "फॉर्म भेजिए", "डॉक्यूमेंट तैयार है", "मेडिकल करवा लूंगा",
            "अच्छा प्लान है", "पसंद आया", "समझ गया",
            "और बताइए", "डिटेल भेजिए", "मीटिंग कर लेते हैं",
        ]
        
        # ==========================================
        # INDIAN INSURANCE - NEGATIVE/OBJECTION SIGNALS
        # ==========================================
        self.negative_signals = [
            # === HARD REJECTIONS ===
            "not interested", "interest nahi hai", "nahi chahiye",
            "bilkul nahi", "kabhi nahi", "never", "no way",
            "mat call karo", "stop calling", "dnc list mein daal do",
            "number block", "complain karunga", "irda complaint",
            "fraud hai", "scam lagta hai", "trust nahi hai",
            
            # === ALREADY COVERED ===
            "pehle se hai", "already have insurance", "policy hai",
            "lic hai", "covered hoon", "family covered hai",
            "company insurance hai", "group mediclaim hai",
            "employer insurance", "sufficient cover hai",
            "renewal due hai", "existing policy", "same plan hai",
            
            # === PRICE OBJECTIONS ===
            "bahut mehenga", "too expensive", "afford nahi",
            "budget nahi hai", "paisa nahi hai", "premium zyada hai",
            "emi afford nahi", "salary se zyada", "loan chal raha hai",
            "kharcha bahut hai", "savings nahi hai", "cash crunch",
            "lic sasta hai", "online sasta milta hai", "compare kiya mehenga hai",
            
            # === TRUST ISSUES (Common in Insurance) ===
            "claim nahi milta", "claim reject", "company fraud karti hai",
            "paisa doobta hai", "bharosa nahi", "trust issues",
            "relative ka reject hua", "news mein dekha", "reviews kharab hai",
            "agent ne dhoka diya", "hidden charges", "fine print",
            "terms and conditions", "loopholes hai",
            
            # === DELAY TACTICS ===
            "baad mein", "later", "abhi nahi", "sochna hai",
            "family se poochna hai", "wife se baat karni hai",
            "husband decide karega", "papa se poochna hai",
            "next month", "salary ke baad", "bonus ke baad",
            "diwali ke baad", "new year mein", "april mein",
            "financial year start", "busy hoon", "time nahi hai",
            "meeting mein hoon", "driving kar raha", "office mein",
            
            # === COMPETITOR PREFERENCE ===
            "lic better hai", "government company chahiye",
            "private company nahi", "lic se hi lunga",
            "hdfc se le liya", "icici wala hai", "max life hai",
            "sbi life better", "bajaj allianz", "tata aia prefer",
            "agent jaanta hoon", "relative agent hai", "friend ka policy",
            
            # === AGE/HEALTH CONCERNS ===
            "young hoon abhi", "shaadi nahi hui", "bachhe nahi hai",
            "health issues hai", "diabetes hai", "bp hai", "heart problem",
            "medical reject hoga", "premium zyada aayega health ke wajah se",
            "smoking karta hoon", "pre existing hai",
            
            # === INVESTMENT OBJECTIONS ===
            "mutual fund better", "fd karta hoon", "stock market",
            "returns kam hai", "inflation beat nahi karta",
            "lock in bahut hai", "liquidity nahi", "surrender value kam",
            "insurance investment nahi hai", "term lo invest separately",
            
            # === SKEPTICISM ===
            "kya guarantee hai", "pakka milega", "written mein do",
            "bharosa kaise karoon", "commission kitna hai tumhara",
            "company kitne saal purani hai", "market cap kya hai",
            
            # === HINDI NEGATIVE ===
            "नहीं चाहिए", "बिल्कुल नहीं", "इंटरेस्ट नहीं है",
            "पहले से है", "बहुत महंगा है", "अफोर्ड नहीं होगा",
            "बाद में बात करेंगे", "सोचना पड़ेगा", "परिवार से पूछना है",
            "भरोसा नहीं है", "क्लेम नहीं मिलता", "धोखा होता है",
            "टाइम नहीं है", "बिजी हूं", "कॉल मत करो",
        ]
        
        # ==========================================
        # INDIAN INSURANCE - URGENCY SIGNALS
        # ==========================================
        self.urgency_signals = [
            # === TIME-BOUND URGENCY ===
            "aaj hi chahiye", "abhi chahiye", "turant",
            "immediately", "urgent", "jaldi karo", "fast track",
            "kal tak", "is hafte", "is mahine", "end of month",
            
            # === POLICY/DEADLINE URGENCY ===
            "policy expire ho rahi", "renewal due", "lapse ho jayegi",
            "grace period khatam", "deadline hai", "offer khatam",
            "discount expiring", "price badh jayega", "age badh jayegi",
            "birthday aa raha hai", "premium badh jayega",
            
            # === LIFE EVENT URGENCY ===
            "loan sanction hua hai", "bank maang raha hai",
            "visa ke liye chahiye", "travel next week", "abroad ja raha",
            "surgery scheduled", "hospital admission", "operation hai",
            "shaadi next month", "baby due", "delivery date near",
            
            # === TAX URGENCY ===
            "march end hai", "financial year end", "80c balance hai",
            "tax filing deadline", "proof chahiye office ko",
            "employer maang raha", "it return", "march 31 tak",
            
            # === EMOTIONAL URGENCY ===
            "tension ho rahi hai", "family worried", "wife keh rahi",
            "parents pressure de rahe", "peace of mind chahiye",
            "raat ko neend nahi aati", "risk nahi lena",
            
            # === HINDI URGENCY ===
            "तुरंत चाहिए", "अभी चाहिए", "आज ही करो",
            "जल्दी करो", "टाइम नहीं है", "डेडलाइन है",
            "एक्सपायर हो रही है", "मार्च एंड है", "टैक्स सेविंग",
        ]

        # ==========================================
        # DECISION MAKER SIGNALS (Indian Context)
        # ==========================================
        self.decision_maker_signals = [
            # === AUTHORITY STATEMENTS ===
            "main decide karunga", "mera decision hai", "final say mera",
            "main hi lunga", "meri marzi", "khud decide karunga",
            "kisi se nahi poochna", "authority meri hai",
            
            # === FINANCIAL AUTHORITY ===
            "paisa main handle karta", "finance main dekhta",
            "salary meri hai", "income meri hai", "account mera hai",
            "main kamata hoon", "sole earner", "main hi bharta hoon",
            
            # === HEAD OF FAMILY ===
            "ghar ka mukhiya", "family head", "main dekhta hoon sab",
            "mere upar hai", "zimmedari meri hai", "main sambhalta",
            
            # === INDEPENDENT BUYER ===
            "single hoon", "married but independent", "my money",
            "khud ka paisa", "apni kamai", "no dependency",
            "self employed", "business owner", "entrepreneur hoon",
            
            # === QUICK DECISION MAKER ===
            "abhi decide kar leta", "sochna nahi hai", "pakka hai",
            "confirm hai", "done deal", "final hai", "no second thought",
            
            # === HINDI ===
            "मैं फैसला करूंगा", "मेरा डिसीजन है", "किसी से नहीं पूछना",
            "पैसा मैं देखता हूं", "घर का मुखिया", "अकेला कमाता हूं",
            "खुद तय करूंगा", "फाइनल है",
        ]
        
        # ==========================================
        # INSURANCE-SPECIFIC HIGH-VALUE SIGNALS
        # ==========================================
        self.high_value_signals = [
            # === HIGH COVERAGE INTEREST ===
            "1 crore", "2 crore", "50 lakh", "one crore",
            "high cover", "maximum cover", "zyada cover chahiye",
            "comprehensive plan", "full coverage", "all risks",
            
            # === PREMIUM PAYING CAPACITY ===
            "yearly premium theek hai", "annual pay", "single premium",
            "lump sum de dunga", "one shot payment", "bulk payment",
            "emi nahi chahiye", "full amount de dunga",
            
            # === MULTIPLE POLICIES ===
            "family ke liye bhi", "wife ka bhi", "bachon ka bhi",
            "parents ke liye", "all family members", "group plan",
            
            # === REFERRAL POTENTIAL ===
            "dost ko bhi bataunga", "colleague interested",
            "bhai ko bhi chahiye", "office mein bataunga",
            "reference de sakta hoon",
        ]
    
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
    
    
    
    def detect_decision_maker(self, text):
        """Detect if the customer is a decision maker based on authority signals"""
        text_lower = text.lower()
        found = [p for p in self.decision_maker_signals if p in text_lower]

        return {
            "count": len(found),
            "keywords": found
        }


    
    def extract_buying_signals(self, text):
        """Extract buying signals from text with evidence (optimized for Indian insurance)"""
        text_lower = text.lower()
        
        # Track which signals were found with evidence
        positive_found = [signal for signal in self.positive_signals if signal in text_lower]
        negative_found = [signal for signal in self.negative_signals if signal in text_lower]
        urgency_found = [signal for signal in self.urgency_signals if signal in text_lower]
        high_value_found = [signal for signal in self.high_value_signals if signal in text_lower]
        
        return {
            'positive_signals': len(positive_found),
            'negative_signals': len(negative_found),
            'urgency_signals': len(urgency_found),
            'high_value_signals': len(high_value_found),
            'positive_keywords': positive_found,
            'negative_keywords': negative_found,
            'urgency_keywords': urgency_found,
            'high_value_keywords': high_value_found
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
        
        # 2. Buying Signals (40% weight) - Enhanced for Indian Insurance
        all_customer_text = ' '.join([m.get('text', '') for m in customer_messages])
        signals = self.extract_buying_signals(all_customer_text)
        
        positive_score = min(len(set(signals['positive_keywords'])) * 3, 20)
        negative_penalty = min(len(set(signals['negative_keywords'])) * 4, 15)  # Higher penalty for objections
        urgency_score = min(len(set(signals['urgency_keywords'])) * 8, 12)
        high_value_score = min(len(set(signals['high_value_keywords'])) * 5, 10)  # Bonus for high-value signals
        
        buying_signal_score = max(0, positive_score + urgency_score + high_value_score - negative_penalty)
        
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
        
        if signals.get('high_value_signals', 0) > 0:
            keywords_str = ', '.join([f'"{kw}"' for kw in signals['high_value_keywords']])
            factors.append({
                'type': 'high_value',
                'label': "High-value prospect signals",
                'evidence': f"Premium indicators: {keywords_str}",
                'keywords': signals['high_value_keywords']
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
                'response_quality': round(response_quality, 2),
                'decision_maker_score': round(decision_score, 2),
                'high_value_score': round(high_value_score, 2)
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