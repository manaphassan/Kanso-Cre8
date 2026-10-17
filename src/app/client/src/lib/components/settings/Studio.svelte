<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { studioService } from '$lib/services/studioService.svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';
  import StationeryPreview from './StationeryPreview.svelte';
  import StudioIdentity from './StudioIdentity.svelte';
  import StudioRemittance from './StudioRemittance.svelte';

  let studioName = $state(studioService.profile.studioName);
  let principalName = $state(studioService.profile.principalName);
  let professionalTitle = $state(studioService.profile.professionalTitle);
  let tagline = $state(studioService.profile.tagline);
  let logo = $state(studioService.profile.logo);
  let brandColor = $state(studioService.profile.brandColor);

  let businessRegNo = $state(studioService.profile.businessRegNo);
  let billingEmail = $state(studioService.profile.billingEmail);
  let studioAddress = $state(studioService.profile.studioAddress);
  let website = $state(studioService.profile.website);
  let phone = $state(studioService.profile.phone);

  let paymentBank = $state(studioService.profile.paymentBank);
  let paymentAccountNo = $state(studioService.profile.paymentAccountNo);
  let paymentAccountName = $state(studioService.profile.paymentAccountName);
  let paymentSwiftOrQr = $state(studioService.profile.paymentSwiftOrQr);
  let defaultPaymentTerms = $state(studioService.profile.defaultPaymentTerms);
  let defaultCurrency = $state(studioService.profile.defaultCurrency || settingsStore.settings.currency || 'MYR');

  let digitalSignature = $state(studioService.profile.digitalSignature);
  let footerNotice = $state(studioService.profile.footerNotice);
  let isSavingProfile = $state(false);

  function handleFieldUpdate(field: string, val: string) {
    if (field === 'studioName') studioName = val;
    else if (field === 'principalName') principalName = val;
    else if (field === 'professionalTitle') professionalTitle = val;
    else if (field === 'tagline') tagline = val;
    else if (field === 'businessRegNo') businessRegNo = val;
    else if (field === 'billingEmail') billingEmail = val;
    else if (field === 'studioAddress') studioAddress = val;
    else if (field === 'website') website = val;
    else if (field === 'phone') phone = val;
    else if (field === 'paymentBank') paymentBank = val;
    else if (field === 'paymentAccountNo') paymentAccountNo = val;
    else if (field === 'paymentAccountName') paymentAccountName = val;
    else if (field === 'paymentSwiftOrQr') paymentSwiftOrQr = val;
    else if (field === 'defaultPaymentTerms') defaultPaymentTerms = val;
    else if (field === 'footerNotice') footerNotice = val;
  }

  async function handleProfileSave() {
    isSavingProfile = true;
    try {
      await studioService.saveProfile({
        studioName: studioName.trim(),
        principalName: principalName.trim(),
        professionalTitle: professionalTitle.trim(),
        tagline: tagline.trim(),
        logo: logo || '',
        brandColor: brandColor || 'var(--kanso-accent)',
        businessRegNo: businessRegNo.trim(),
        billingEmail: billingEmail.trim(),
        studioAddress: studioAddress.trim(),
        website: website.trim(),
        phone: phone.trim(),
        paymentBank: paymentBank.trim(),
        paymentAccountNo: paymentAccountNo.trim(),
        paymentAccountName: paymentAccountName.trim(),
        paymentSwiftOrQr: paymentSwiftOrQr.trim(),
        defaultPaymentTerms: defaultPaymentTerms.trim(),
        defaultCurrency: defaultCurrency.trim(),
        digitalSignature: digitalSignature || '',
        footerNotice: footerNotice.trim()
      });

      settingsStore.updateSettings({ currency: defaultCurrency.trim() as any });

      if (appState.currentUser) {
        appState.currentUser.name = principalName.trim() || studioName.trim();
        appState.currentUser.email = billingEmail.trim();
        appState.currentUser.role = professionalTitle.trim();
        appState.currentUser.avatar = logo || '';
        appState.currentUser.avatarColor = brandColor || 'var(--kanso-accent)';
      }
      appState.addToast('Studio and brand profile saved successfully.', 'success', 'Profile Updated');
    } catch (err: any) {
      appState.addToast(`Failed to save studio profile: ${err.message}`, 'error');
    } finally {
      isSavingProfile = false;
    }
  }

  onMount(async () => {
    await studioService.init();
    studioName = studioService.profile.studioName;
    principalName = studioService.profile.principalName;
    professionalTitle = studioService.profile.professionalTitle;
    tagline = studioService.profile.tagline;
    logo = studioService.profile.logo;
    brandColor = studioService.profile.brandColor;
    businessRegNo = studioService.profile.businessRegNo;
    billingEmail = studioService.profile.billingEmail;
    studioAddress = studioService.profile.studioAddress;
    website = studioService.profile.website;
    phone = studioService.profile.phone;
    paymentBank = studioService.profile.paymentBank;
    paymentAccountNo = studioService.profile.paymentAccountNo;
    paymentAccountName = studioService.profile.paymentAccountName;
    paymentSwiftOrQr = studioService.profile.paymentSwiftOrQr;
    defaultPaymentTerms = studioService.profile.defaultPaymentTerms;
    defaultCurrency = studioService.profile.defaultCurrency || settingsStore.settings.currency || 'MYR';
    digitalSignature = studioService.profile.digitalSignature;
    footerNotice = studioService.profile.footerNotice;
  });
</script>

<div class="settings-grid">
  <StationeryPreview
    {studioName}
    {principalName}
    {tagline}
    {logo}
    {brandColor}
    {businessRegNo}
    {billingEmail}
    {studioAddress}
    {phone}
    {paymentBank}
    {paymentAccountNo}
    {defaultCurrency}
  />

  <StudioIdentity
    {studioName}
    {principalName}
    {professionalTitle}
    {tagline}
    {logo}
    {brandColor}
    onUpdateLogo={(val) => (logo = val)}
    onUpdateBrandColor={(val) => (brandColor = val)}
    onUpdateField={handleFieldUpdate}
  />

  <StudioRemittance
    {businessRegNo}
    {billingEmail}
    {studioAddress}
    {website}
    {phone}
    {defaultCurrency}
    {paymentBank}
    {paymentAccountNo}
    {paymentAccountName}
    {paymentSwiftOrQr}
    {defaultPaymentTerms}
    {digitalSignature}
    {footerNotice}
    {isSavingProfile}
    onUpdateSignature={(val) => (digitalSignature = val)}
    onUpdateCurrency={(val) => {
      defaultCurrency = val;
      settingsStore.updateSettings({ currency: val.trim() as any });
    }}
    onUpdateField={handleFieldUpdate}
    onSave={handleProfileSave}
  />
</div>

<style>
  .settings-grid {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
</style>
