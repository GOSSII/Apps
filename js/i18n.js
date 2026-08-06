/* Hindi first — most kirana owners read Devanagari faster than English.
   Language is a setting, stored with the rest of the data. */

const I18N = (() => {
  const strings = {
    hi: {
      appName: 'उधार खाता',
      toReceive: 'लेने हैं',
      toPay: 'देने हैं',
      searchCustomer: 'ग्राहक खोजें',
      noCustomers: 'अभी कोई ग्राहक नहीं। नीचे से नया ग्राहक जोड़ें।',
      noMatch: 'कोई ग्राहक नहीं मिला।',
      newCustomer: 'नया ग्राहक',
      customerName: 'ग्राहक का नाम',
      phone: 'मोबाइल नंबर (वैकल्पिक)',
      noteOptional: 'नोट (वैकल्पिक)',
      save: 'सेव करें',
      cancel: 'रद्द करें',
      youGave: 'आपने दिए',
      youGot: 'आपने लिए',
      given: 'दिए',
      received: 'लिए',
      amount: 'रकम (₹)',
      date: 'तारीख',
      details: 'विवरण',
      entries: 'हिसाब',
      noEntries: 'अभी कोई एंट्री नहीं।',
      willGet: 'लेने हैं',
      willGive: 'देने हैं',
      settled: 'हिसाब बराबर',
      remind: 'WhatsApp पर याद दिलाएँ',
      call: 'कॉल करें',
      editCustomer: 'ग्राहक बदलें',
      deleteCustomer: 'ग्राहक हटाएँ',
      confirmDeleteCustomer: 'यह ग्राहक और इसका पूरा हिसाब हट जाएगा। पक्का?',
      confirmDeleteEntry: 'यह एंट्री हटाएँ?',
      settings: 'सेटिंग',
      shopName: 'दुकान का नाम',
      upiId: 'UPI ID (वैकल्पिक)',
      upiHint: 'रिमाइंडर मैसेज में UPI ID अपने आप जुड़ जाएगी।',
      language: 'भाषा',
      backup: 'बैकअप और डेटा',
      downloadBackup: 'बैकअप डाउनलोड करें',
      restoreBackup: 'बैकअप वापस लाएँ',
      downloadCsv: 'CSV (Excel) डाउनलोड करें',
      clearAll: 'सारा डेटा मिटाएँ',
      confirmClear: 'सारा डेटा हमेशा के लिए मिट जाएगा। पक्का?',
      privacy: 'सारा डेटा सिर्फ़ इसी फ़ोन में सेव होता है। कोई सर्वर नहीं, कोई अकाउंट नहीं।',
      saved: 'सेव हो गया',
      restored: 'बैकअप वापस आ गया',
      cleared: 'डेटा मिट गया',
      deleted: 'हटा दिया',
      badFile: 'यह फ़ाइल पढ़ी नहीं जा सकी',
      needName: 'नाम ज़रूरी है',
      needAmount: 'सही रकम डालें',
      needPhone: 'इस ग्राहक का मोबाइल नंबर सेव नहीं है',
      reminderMsg: (name, amt, shop, upi) =>
        `नमस्ते ${name} जी, ${shop ? shop + ' का ' : ''}₹${amt} बकाया है। ` +
        `सुविधा हो तो भुगतान कर दीजिए।` + (upi ? ` UPI: ${upi}` : '') + ` धन्यवाद।`
    },
    en: {
      appName: 'Udhar Khata',
      toReceive: 'You will get',
      toPay: 'You will give',
      searchCustomer: 'Search customer',
      noCustomers: 'No customers yet. Add your first one below.',
      noMatch: 'No customer found.',
      newCustomer: 'New customer',
      customerName: 'Customer name',
      phone: 'Mobile number (optional)',
      noteOptional: 'Note (optional)',
      save: 'Save',
      cancel: 'Cancel',
      youGave: 'You gave',
      youGot: 'You got',
      given: 'Given',
      received: 'Got',
      amount: 'Amount (₹)',
      date: 'Date',
      details: 'Details',
      entries: 'Ledger',
      noEntries: 'No entries yet.',
      willGet: 'You will get',
      willGive: 'You will give',
      settled: 'All settled',
      remind: 'Remind on WhatsApp',
      call: 'Call',
      editCustomer: 'Edit customer',
      deleteCustomer: 'Delete customer',
      confirmDeleteCustomer: 'This customer and their whole ledger will be deleted. Sure?',
      confirmDeleteEntry: 'Delete this entry?',
      settings: 'Settings',
      shopName: 'Shop name',
      upiId: 'UPI ID (optional)',
      upiHint: 'Added automatically to reminder messages.',
      language: 'Language',
      backup: 'Backup & data',
      downloadBackup: 'Download backup',
      restoreBackup: 'Restore backup',
      downloadCsv: 'Download CSV (Excel)',
      clearAll: 'Erase all data',
      confirmClear: 'All data will be erased permanently. Sure?',
      privacy: 'Everything stays on this phone. No server, no account.',
      saved: 'Saved',
      restored: 'Backup restored',
      cleared: 'Data erased',
      deleted: 'Deleted',
      badFile: 'Could not read that file',
      needName: 'Name is required',
      needAmount: 'Enter a valid amount',
      needPhone: 'No mobile number saved for this customer',
      reminderMsg: (name, amt, shop, upi) =>
        `Hello ${name}, ₹${amt} is pending${shop ? ' at ' + shop : ''}. ` +
        `Please pay when convenient.` + (upi ? ` UPI: ${upi}` : '') + ` Thank you.`
    }
  };

  let lang = 'hi';

  return {
    setLang(l) { lang = strings[l] ? l : 'hi'; },
    get lang() { return lang; },
    t(key, ...args) {
      const val = (strings[lang] || strings.hi)[key];
      if (val === undefined) return key;
      return typeof val === 'function' ? val(...args) : val;
    }
  };
})();
