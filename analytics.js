function fireClickEvent(type, inbound, label) {

    gtag('event', type, {
        'click_inbound': inbound,
        'click_label': label,
        'domain': window.location.hostname
    });
}